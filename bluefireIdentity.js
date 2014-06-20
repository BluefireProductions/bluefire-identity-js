/**
 * Created by bluefire on 2/20/14.
 */

"use strict";

//Note that use of this automated function requires that the client app reserves the GET keyword 'token'
//for use by the identity system.  Otherwise, we run the risk of overwriting a value JWT token with the
//client app 'token' on page reload at some point.
angular.module('BluefireIdentity',['ngCookies'])
    .config(function($httpProvider){
        $httpProvider.interceptors.push('bluefireIdentity');
    })
    .run(function ($rootScope, $state, bluefireIdentity) {
        bluefireIdentity.setJwtFromUrl();
        $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams){
            if (toState.needAuth && !bluefireIdentity.isAuthorized()){
                // User isn’t authenticated
                var toHref = $state.href(toState,toParams);

                var full = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '') + location.pathname;
                var redirectString = "https://bluefire-sso.appspot.com/?redirect_uri=" + encodeURIComponent(full) + encodeURIComponent(toHref);
                console.log("Redirecting to: " + redirectString);
                window.location = redirectString;
                event.preventDefault();
            }
        })
    });

angular.module('BluefireIdentity').factory('bluefireIdentity', [ "$q", "$cookies", function ($q, $cookies) {
    var factory = {};

    factory.isAuthorized = function(){
        if ($cookies.jwt === undefined || $cookies.jwt == null)
        {
            return false;
        }
        return true;
    }

    /*$http Interceptor Function*/
    factory.responseError = function(response) {
        var status = response.status;

        if (status == 403) {
            var redirectString = "https://bluefire-sso.appspot.com/?redirect_uri=" + encodeURIComponent(window.location);
            console.log("Redirecting to: " + redirectString);
            debugger;
            window.location = redirectString;
            return;
        }
        // otherwise
        return $q.reject(response);
    }

    /*$http Interceptor function*/
    factory.request = function(config){

        if (typeof String.prototype.startsWith != 'function') {
            String.prototype.startsWith = function (str){
                return this.slice(0, str.length) == str;
            };
        }

        if (isSecureUrl(config.url) && factory.isAuthorized()) {
            config.headers['Authorization'] = "Bearer " + $cookies.jwt;
        }
        return config;



        function isSecureUrl(url){
            if (url.startsWith("https://") && url.indexOf("bluefire") > -1)
            {
                return true;
            }

            if (url.startsWith("http://localhost:"))
            {
                return true;
            }

            return false;

        }
    }

    factory.setJwtFromUrl = function(){
        var QueryString = function () {
            // This function is anonymous, is executed immediately and
            // the return value is assigned to QueryString!
            var query_string = {};
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i=0;i<vars.length;i++) {
                var pair = vars[i].split("=");
                // If first entry with this name
                if (typeof query_string[pair[0]] === "undefined") {
                    query_string[pair[0]] = pair[1];
                    // If second entry with this name
                } else if (typeof query_string[pair[0]] === "string") {
                    var arr = [ query_string[pair[0]], pair[1] ];
                    query_string[pair[0]] = arr;
                    // If third or later entry with this name
                } else {
                    query_string[pair[0]].push(pair[1]);
                }
            }
            return query_string;
        } ();

        if (QueryString.token !== undefined)
        {
            $cookies.jwt = QueryString.token;
        }
    };

    factory.getJwt = function(){
        return $cookies.jwt;
    }

    factory.setJwt = function(jwt){
        $cookies.jwt = jwt;
    };

    factory.clearJwt = function(){
        delete $cookies['jwt'];
    };

    factory.getAuthorizationHeader = function(){
        if ($cookies.jwt === undefined || $cookies.jwt == null)
        {
            return "";
        }

        return "Bearer " + $cookies.jwt;
    };



    return factory;


} ]);
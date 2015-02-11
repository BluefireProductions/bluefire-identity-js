'use strict';

/**
 * @ngdoc overview
 * @name BluefireIdentity
 * @description
 * # BluefireIdentity
 *
 * Shared JS for Bluefire Identity service to auto-login an Angular app using Angular ui routing.
 * Include this module in your Angular app and it will automatically redirect you to the Bluefire SSO
 * server webpage which allows you to log in with your Google account. Once you have signed in, the SSO
 * server is configured to redirect the user back to the URL specified in the redirect_uri parameter along
 * with a token parameter containing the JWT token which will then be automatically included as an
 * Authorization header on all subsequent requests to URLs beginning with either http://localhost: or
 * https://bluefire. These URLs will be intercepted by BluefireIdentity and the JWT token will be added
 * as an Authorization header, thus allowing the Angular app to communicate with secure services.
 *
 * Note that use of this automated function requires that the client app reserves the GET keyword 'token'
 * for use by the identity system.  Otherwise, we run the risk of overwriting a value JWT token with the
 * client app 'token' on page reload at some point.
 */

angular.module('BluefireIdentity', ['LocalStorageModule'])
    .config(function ($httpProvider) {
      $httpProvider.interceptors.push('bluefireIdentity');
    })
    .run(function ($rootScope, $state, bluefireIdentity) {
      bluefireIdentity.setJwtFromUrl();
      $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
        if (toState.needAuth && !bluefireIdentity.isAuthorized()) {
          // User isn’t authenticated
          var toHref = $state.href(toState, toParams);

          var full = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + location.pathname;
          var redirectString = 'https://bluefire-sso.appspot.com/?redirect_uri=' + encodeURIComponent(full) + encodeURIComponent(toHref);
          console.log('Redirecting to: ' + redirectString);
          window.location = redirectString;
          event.preventDefault();
        }
      });
    });

/**
 * @ngdoc function
 * @name BluefireIdentity.factory:bluefireIdentity
 * @description
 * # bluefireIdentity
 * Factory used by the BluefireIdentity module for intercepting HTTP requests, redirecting to the SSO server
 * webpage when getting a 403 error, and working with the JWT token grabbed from the 'token' URL parameter.
 * Created by Timothy Jones on 2/20/14.
 */

angular.module('BluefireIdentity').factory('bluefireIdentity', [ '$q', 'localStorageService', function ($q, localStorageService) {

  // Helper function to know whether or not to add Authorization headers to an intercepted request.
  function isSecureUrl(url) {
    if (url.startsWith('https://bluefire')) {
      return true;
    }
    if (url.startsWith('http://localhost:')) {
      return true;
    }
    return false;
  }

  var factory = {};

  factory.isAuthorized = function () {
    if (localStorageService.get('jwt') === undefined || localStorageService.get('jwt') === null) {
      return false;
    }
    return true;
  };

  // $http Interceptor function
  factory.responseError = function (response) {
    var status = response.status;
    var url = response.config.url;

    if (status === 403 && isSecureUrl(url)) {
      var redirectString = 'https://bluefire-sso.appspot.com/?redirect_uri=' + encodeURIComponent(window.location);
      console.log('Redirecting to: ' + redirectString);
      debugger;
      window.location = redirectString;
      return response;
    } else {
      return $q.reject(response);
    }
  };

  // $http Interceptor function
  factory.request = function (config) {
    if (typeof String.prototype.startsWith !== 'function') {
      String.prototype.startsWith = function (str) {
        return this.slice(0, str.length) === str;
      };
    }

    if (isSecureUrl(config.url) && factory.isAuthorized()) {
      config.headers['Authorization'] = 'Bearer ' + localStorageService.get('jwt');
    }
    return config;
  };

  factory.setJwtFromUrl = function () {
    var QueryString = function () {
      // This function is anonymous, is executed immediately and
      // the return value is assigned to QueryString!
      var query_string = {};
      var query = window.location.search.substring(1);
      var vars = query.split('&');
      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        // If first entry with this name
        if (typeof query_string[pair[0]] === 'undefined') {
          query_string[pair[0]] = pair[1];
          // If second entry with this name
        } else if (typeof query_string[pair[0]] === 'string') {
          var arr = [ query_string[pair[0]], pair[1] ];
          query_string[pair[0]] = arr;
          // If third or later entry with this name
        } else {
          query_string[pair[0]].push(pair[1]);
        }
      }
      return query_string;
    }();

    if (QueryString.token !== undefined) {
      localStorageService.set('jwt', QueryString.token);
      // Redirect user to the same page they are currently on, sans URL parameters
      window.location = (window.location.origin + window.location.pathname + window.location.hash);
    }
  };

  factory.getJwt = function () {
    return localStorageService.get('jwt');
  };

  factory.setJwt = function (jwt) {
    localStorageService.set('jwt', jwt);
  };

  factory.clearJwt = function () {
    localStorageService.set('jwt', undefined);
  };

  factory.getAuthorizationHeader = function () {
    if (localStorageService.get('jwt') === undefined || localStorageService.get('jwt') === null) {
      return '';
    }
    return 'Bearer ' + localStorageService.get('jwt');
  };

  return factory;
} ]);

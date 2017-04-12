'use strict';

var admin = require('firebase-admin');
require('colors');

exports.init = function(databaseURL, serviceAccount) {
   var config = {
     databaseURL: databaseURL,
     credential: admin.credential.cert(serviceAccount)
   };
   admin.initializeApp(config)
};

exports.authRef = function() {
  return admin.auth();
};

exports.fbMessagingRef = function() {
  return admin.messaging();
}

exports.fbRef = function(path) {
   return admin.database().ref().child(path);
};

exports.fbAdminRef = function() {
  return admin.database().ref();
};

exports.fbTimestamp = function() {
  return admin.database;
};

exports.pathName = function(ref) {
   var p = ref.parent.key;
   return (p? p+'/' : '')+ref.key;
};

exports.isString = function(s) {
  return typeof s === 'string';
};

exports.isObject = function(o) {
  return o && typeof o === 'object';
};

exports.unwrapError = function(err) {
  if( err && typeof err === 'object' ) {
    return err.toString();
  }
  return err;
};

exports.isFunction = function(f) {
  return typeof f === 'function';
};

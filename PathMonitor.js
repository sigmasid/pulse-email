var fbutil = require('./fbutil');
var sendEmail = require('./SendEmail');
var sendInterviewEmail = require('./SendInterviewEmail');

require('colors');

function PathMonitor(path) {
   this.ref = fbutil.fbRef(path);
   this._init();
}

PathMonitor.prototype = {
   _init: function() {
      this.addMonitor = this.ref.on('child_added', this._process.bind(this));
      this.addMonitor = this.ref.on('child_changed', this._update.bind(this));
   },

   _stop: function() {
      this.ref.off('child_added', this.addMonitor);
   },

   _process: function(snap) {
      var dat = snap.val();
      var self = this; 

      if (typeof dat.email !== 'undefined' && typeof dat.inviteSent === 'undefined' ) {
        var emailTo = dat.email;
        var name = dat.name;

            fbutil.fbRef("tags").child(dat.tagID).once('value').then(function(snapshot) {
              if (snapshot.val().hasOwnProperty('title')) {
                var channelName = snapshot.val().title;
                fbutil.authRef().getUserByEmail(emailTo)
                  .then(function(userRecord) {
                    self.existing = userRecord.uid;
                    sendEmail.process(true, emailTo, name, channelName, dat.tagID, snap.key, self._sent.bind(self));
                    console.log("Successfully fetched user data:", userRecord.toJSON());
                  })
                  .catch(function(error) {
                    sendEmail.process(false, emailTo, name, channelName, dat.tagID, snap.key, self._sent.bind(self));
                    console.log("Is a new user", error.toJSON());
                  });
              }
            });
      }
   },

  _update: function(snap) {
      var dat = snap.val();
      if (typeof dat.accountCreated !== 'undefined' || typeof dat.approved !== 'undefined') {
        var uid = typeof dat.accountCreated !== 'undefined' ? dat.accountCreated : dat.uID;
        var updatePost = {};
        updatePost[uid] = true;

        fbutil.authRef().updateUser(uid, {
          displayName: snap.name,
        })
        .then(function(userRecord) {
          fbutil.fbRef("tags").child(dat.tagID).child("experts").update(updatePost);
          fbutil.fbRef("expertRequests").child(snap.key).remove();
          // See the UserRecord reference doc for the contents of userRecord.
          console.log("Successfully updated user ", userRecord.toJSON());
        })
        .catch(function(error) {
          console.log("Error updating user:", error);
        });
      }
   },

   _sent: function(key) {
      console.log('sent fired');

      if (typeof this.existing !== 'undefined') {
        this.ref.child(key).update({
          "inviteSent":true,
          "accountCreated":this.existing
        });        
      } else {
        this.ref.child(key).update({
          "inviteSent":true
        }); 
      }
    },
};

exports.process = function(path) {
  new PathMonitor(path);
};

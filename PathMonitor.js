var fbutil = require('./fbutil');
var sendContributorEmail = require('./SendContributorEmail');
var sendInterviewEmail = require('./SendInterviewEmail');
var sendPerspectiveEmail = require('./SendPerspectiveEmail');
const util = require('util') //print an object
//console.log(util.inspect(posts, false, null)); print an object

require('colors');

function PathMonitor(path) {
   this.ref = fbutil.fbRef(path);
   this._init();
}

PathMonitor.prototype = {
   _init: function() {
      this.addMonitor = this.ref.on('child_added', this._process.bind(this));
      this.addMonitor = this.ref.on('child_changed', this._process.bind(this));
   },

   _stop: function() {
      this.ref.off('child_added', this.addMonitor);
   },

   _process: function(snap) {
      var dat = snap.val();
      var title = "";
      var notificationTitle = "";
      var notificationDescription = "";
      var self = this; 

      //case where an approved channel expert is inviting someone - marked as auto approved. Invite is to an existing pulse user so send message, email, notification
      if (typeof dat.type !== 'undefined' && typeof dat.toUserID !== 'undefined' && typeof dat.requestSent === 'undefined' && dat.approved === 'true') {
        //create message
        let toUserPostPath = "users/" + dat.toUserID + "/conversations/" + dat.fromUserID;
        let fromUserPostPath = "users/" + dat.fromUserID + "/conversations/" + dat.toUserID;
        let messagePath = "messages/" + snap.key;
        let inviteRequestPath = "invites/" + snap.key + "/requestSent";
        let inviteConversationPath = "invites/" + snap.key + "/conversationID";
        var conversationsPath = "";

        if (dat.type === 'interviewInvite') {
          title = "Sent an interview request";
          notificationTitle = "New Interview Request";
          notificationDescription = "Topic: "+dat.title;
        } else if (dat.type === 'perspectiveInvite') {
          title = "Can you share your perspectives - " + dat.title;
          notificationTitle = "Share your perspective!";
          notificationDescription = "Topic: "+dat.title;
        } else if (dat.type === 'questionInvite') {
          title = "Can you help answer - " + dat.title;
          notificationTitle = "Could you help answer this question in '"+dat.tagTitle+"'";
          notificationDescription = "Question: "+dat.title;
        } else if (dat.type === 'contributorInvite') {
          title = "Would you like to be a featured contributor for '"+dat.title+"'?";
          notificationTitle = "Invitation - Become a Featured Contributor";
          notificationDescription = "Channel: "+dat.title;
        } else {
          title = "Check this out on Pulse " + dat.title;
        }

        let message = {"body":title, "fromID":dat.fromUserID, "toID":dat.toUserID,"createdAt":fbutil.fbTimestamp().ServerValue.TIMESTAMP, "type":dat.type};
        var toconvo = {"lastMessageType":dat.type, "lastMessage":title,"lastMessageID":snap.key, "lastMessageTime":fbutil.fbTimestamp().ServerValue.TIMESTAMP};
        var fromconvo = {"lastMessageType":"message","lastMessage":title,"lastMessageID":snap.key,"lastMessageTime":fbutil.fbTimestamp().ServerValue.TIMESTAMP};

        fbutil.fbAdminRef().child(toUserPostPath).once('value', function(conversationSnap) {
          let posts = {};
          if (conversationSnap.val() === null) {
            //new conversation so add in the conversationID
            toconvo["conversationID"]=snap.key;
            fromconvo["conversationID"]=snap.key;
            conversationsPath = "conversations/" + snap.key + "/" + snap.key;
            posts[inviteConversationPath] = snap.key;
          } else {
            let conversationID = conversationSnap.val().conversationID;
            toconvo["conversationID"]=conversationID;
            fromconvo["conversationID"]=conversationID;
            conversationsPath = "conversations/" + conversationID + "/" + snap.key;
            posts[inviteConversationPath] = conversationID;
          }

          posts[toUserPostPath] = toconvo;
          posts[fromUserPostPath] = fromconvo;
          posts[messagePath] = message;
          posts[inviteRequestPath] = true;
          posts[conversationsPath] = fbutil.fbTimestamp().ServerValue.TIMESTAMP;
          
          fbutil.fbAdminRef().update(posts, function(error) {
            if (error) {
              console.log("Data could not be saved." + error);
            } else {
              fbutil.authRef().getUser(dat.toUserID)
              .then(function(userRecord) {
                if (typeof userRecord.email !== 'undefined') {
                  //self._processEmail(userRecord.email, snap);
                  if (notificationTitle !== '' ) {
                    self._processNotification(dat.toUserID, snap.key, notificationTitle, notificationDescription);
                  }
                  console.log("Successfully fetched user data in toUserID:", userRecord.email);
                }
              })
              .catch(function(error) {
                console.log("Error fetching user data:", error);
              });
            }
          });
        });
      }

      //case where we have the user email - check if user exists if yes, then set uID and function fires again, if not then just send the email
      else if (typeof dat.type !== 'undefined' && typeof dat.toUserEmail !== 'undefined' && typeof dat.emailSent === 'undefined' && typeof dat.requestSent === 'undefined' && dat.approved === 'true') {
        var email = dat.toUserEmail.toLowerCase();

        fbutil.authRef().getUserByEmail(dat.toUserEmail)
        .then(function(userRecord) {
          console.log("Successfully fetched user data:", userRecord.toJSON());
          //add the uID to database
          self.ref.child(snap.key).update({
            "toUserID":userRecord.uid
          }); 
        })
        .catch(function(error) {
          //self._processEmail(email, snap);
          console.log("Is not an existing user", error);
        });
      }

      //if child changed and accepted is set - i.e. user accepts / declines the invite
      else if (dat.type === 'contributorInvite' && dat.approved === 'true' && typeof dat.accepted !== 'undefined') {
        let newMessageKey = fbutil.fbAdminRef().child('messages').push().key;

        let channelPath = "channelContributors/" + dat.cID + "/" + dat.toUserID;
        let toUserConversationPath = "users/" + dat.toUserID + "/conversations/" + dat.fromUserID;
        let fromUserConversationPath = "users/" + dat.fromUserID + "/conversations/" + dat.toUserID;
        let toUserVerificationPath = "userDetailedPublicSummary/" + dat.toUserID + "/verifiedChannels/" + dat.cID;
        let messagePath = "messages/" + newMessageKey;
        let oldMessageTypePath = "messages/" + snap.key + "/type"; //old message - remove the contributorInvite type and make it a message
        let conversationsPath = "conversations/" + dat.conversationID + "/" + newMessageKey;

        let acceptMessageBody = "Accepted contributor invite for '"+dat.title+"'";
        let declineMessageBody = "Declined contributor invite for '"+dat.title+"'";

        let acceptMessage = {"body":"Accepted contributor invite", "fromID":dat.toUserID, "toID":dat.fromUserID,"createdAt":fbutil.fbTimestamp().ServerValue.TIMESTAMP, "type":"message"};
        let declineMessage = {"body":"Declined contributor invite", "fromID":dat.toUserID, "toID":dat.fromUserID,"createdAt":fbutil.fbTimestamp().ServerValue.TIMESTAMP, "type":"message"};
        
        let posts = {};
        var toConvo = {};
        var fromConvo = {};

        if (dat.accepted === true) {
          toConvo = {"conversationID":dat.conversationID, "lastMessageType":"message", "lastMessage":acceptMessageBody,"lastMessageID":newMessageKey, "lastMessageTime":fbutil.fbTimestamp().ServerValue.TIMESTAMP};
          fromConvo = {"conversationID":dat.conversationID, "lastMessageType":"message","lastMessage":acceptMessageBody,"lastMessageID":newMessageKey,"lastMessageTime":fbutil.fbTimestamp().ServerValue.TIMESTAMP};

          posts[channelPath] = true;
          posts[toUserVerificationPath] = true
          posts[messagePath] = acceptMessage;

        } else {
          toConvo = {"conversationID":dat.conversationID, "lastMessageType":"message", "lastMessage":declineMessageBody,"lastMessageID":newMessageKey, "lastMessageTime":fbutil.fbTimestamp().ServerValue.TIMESTAMP};
          fromConvo = {"conversationID":dat.conversationID, "lastMessageType":"message","lastMessage":declineMessageBody,"lastMessageID":newMessageKey,"lastMessageTime":fbutil.fbTimestamp().ServerValue.TIMESTAMP};
          posts[messagePath] = declineMessage;
        }

        posts[oldMessageTypePath] = "message";
        posts[toUserConversationPath] = toConvo;
        posts[fromUserConversationPath] = fromConvo;
        posts[conversationsPath] = fbutil.fbTimestamp().ServerValue.TIMESTAMP;

        fbutil.fbAdminRef().update(posts, function(error) {
            if (error) {
              console.log("Data could not be saved." + error);
            } else {
              console.log("Update data Successfully");
            }
        })
      }

      //contributor invite from an non approved user - send email to admin
      else if (dat.type === 'contributorInvite' && dat.approved === 'false') {
        self._processEmail("hi@checkpulse.co", snap);
      }
   },

  _processEmail: function(email, snap) {
      var dat = snap.val();
      var self = this; 

      var inviteID = (typeof snap.key !== 'undefined') ? snap.key : "";
      var inviteTitle = (typeof dat.title !== 'undefined') ? dat.title : "";

      var cID = (typeof dat.cID !== 'undefined') ? dat.cID : "";
      var cTitle = (typeof dat.cTitle !== 'undefined') ? dat.cTitle : "";

      var tagID = (typeof dat.tagID !== 'undefined') ? dat.tagID : "";
      var tagTitle = (typeof dat.tagTitle !== 'undefined') ? dat.tagTitle : "";

      var fromID = (typeof dat.fromUserID !== 'undefined') ? dat.fromUserID : "";
      var fromName = (typeof dat.fromUserName !== 'undefined') ? dat.fromUserName : "";

      var toName = (typeof dat.toUserName !== 'undefined') ? dat.toUserName : "";
      var questions = [];

      Object.keys(dat.questions).forEach(key => {
        questions.push(dat.questions[key]);
      });

      } else if (dat.type !== 'undefined' && dat.type == 'interviewInvite') {
        sendInterviewEmail.process(email, inviteID, inviteTitle, cID, cTitle, tagID, tagTitle, fromID, fromName, toName, questions, self._sent.bind(self));
      } else if (dat.type !== 'undefined' && dat.type == 'perspectiveInvite') {
        sendPerspectiveEmail.process(email, inviteID, inviteTitle, cID, cTitle, tagID, tagTitle, fromID, fromName, toName, self._sent.bind(self));
      } else if (dat.type !== 'undefined' && dat.type == 'contributorInvite') {
        sendContributorEmail.process(email, inviteID, inviteTitle, cID, cTitle, tagID, tagTitle, fromID, fromName, toName, self._sent.bind(self));
      }
  },

  _processNotification: function(userID, inviteID, title, description) {
    //check if userid has a notificationID - if yes, send notification
    let notificationsPath = "notificationIDs/"+userID;
    var payload = {
      notification: {
        title: title,
        body: description
      },
      data: {
        link: "http://checkpulse.co/invite/"+inviteID
      }
    };

    fbutil.fbAdminRef().child(notificationsPath).once('value', function(notificationSnap) {
      if (notificationSnap.val() !== null) {
        let registrationToken = notificationSnap.val();
        // Send a message to the device corresponding to the provided
        // registration token.
        fbutil.fbMessagingRef().sendToDevice(registrationToken, payload)
          .then(function(response) {
            // See the MessagingDevicesResponse reference documentation for
            // the contents of response.
            console.log("Successfully sent message:", response);
          })
          .catch(function(error) {
            console.log("Error sending message:", error);
          });
      }
    });
  },

   _sent: function(key) {
      console.log('sent fired');

      this.ref.child(key).update({
        "emailSent":true
      }); 
    },
};

exports.process = function(path) {
  new PathMonitor(path);
};

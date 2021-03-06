require('colors');
var helper = require('sendgrid').mail;
var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
var fbutil = require('./fbutil');

function EmailSender(email, inviteID, inviteTitle, cID, cTitle, tagID, tagTitle, fromID, fromName, toName, questions, sent) {
  this.email = email;
  this.inviteID = inviteID;
  this.inviteTitle = inviteTitle;

  this.cID = cID;
  this.cTitle = cTitle;

  this.tagID = tagID;
  this.tagTitle = tagTitle;

  this.fromID = fromID;
  this.fromName = fromName;
  this.toName = toName;

  this.questions = questions;

  this.sent = sent;
  this._sendEmail();
}

EmailSender.prototype = {
  _toTitleCase: function(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
  },

  _sendEmail: function() {
    console.log("email is " + this.email);
    var to_email = new helper.Email(this.email);
    var subject = "Interview Request for " + this._toTitleCase(this.tagTitle) + " series";

    var personalization = new helper.Personalization()
    substitution = new helper.Substitution("%fromName%", this.fromName);
    personalization.addSubstitution(substitution);
    substitution = new helper.Substitution("%toName%", this.toName);
    personalization.addSubstitution(substitution);

    substitution = new helper.Substitution("%channel_name%", this._toTitleCase(this.cTitle));
    personalization.addSubstitution(substitution);
    substitution = new helper.Substitution("%channel_id%", this.cID);
    personalization.addSubstitution(substitution);

    substitution = new helper.Substitution("%series_id%", this.tagID);
    personalization.addSubstitution(substitution);
    substitution = new helper.Substitution("%series_name%", this.tagTitle);
    personalization.addSubstitution(substitution);

    substitution = new helper.Substitution("%invite_id%", this.inviteID);
    personalization.addSubstitution(substitution);
    substitution = new helper.Substitution("%invite_title%", this.inviteTitle);
    personalization.addSubstitution(substitution);

    personalization.addTo(to_email);
    custom_arg = new helper.CustomArgs("type", "interview_invite");
    personalization.addCustomArg(custom_arg);

    if (this.questions.length > 0) {
      substitution = new helper.Substitution("%question1%", this.questions[0]);
      personalization.addSubstitution(substitution);
    } else {
      substitution = new helper.Substitution("%question1%", "");
      personalization.addSubstitution(substitution);
    }

    if (this.questions.length > 1) {
      substitution = new helper.Substitution("%question2%", this.questions[1]);
      personalization.addSubstitution(substitution);
    } else {
      substitution = new helper.Substitution("%question2%", "");
      personalization.addSubstitution(substitution);
    }

    if (this.questions.length > 2) {
      substitution = new helper.Substitution("%question3%", this.questions[2]);
      personalization.addSubstitution(substitution);
    } else {
      substitution = new helper.Substitution("%question3%", "");
      personalization.addSubstitution(substitution);
    }

    let inviteLink = "https://tc237.app.goo.gl/?link=http://checkpulse.co/interviewRequests/" + this.inviteID + "&ibi=co.checkpulse.pulse&isi=1200702658";
    substitution = new helper.Substitution("%inviteLink%", inviteLink);
    personalization.addSubstitution(substitution);

    let pulseLink = "https://tc237.app.goo.gl/?link=http://checkpulse.co/&ibi=co.checkpulse.pulse&isi=1200702658";
    substitution = new helper.Substitution("%pulse_link%", pulseLink);
    personalization.addSubstitution(substitution);

    let channelLink = "https://tc237.app.goo.gl/?link=http://checkpulse.co/c/" + this.cID + "&ibi=co.checkpulse.pulse&isi=1200702658";
    substitution = new helper.Substitution("%channel_link%", channelLink);
    personalization.addSubstitution(substitution);

    var mail = new helper.Mail();
    mail.addPersonalization(personalization);    
    mail.setTemplateId("d1468f22-1653-4a08-828a-b72767493de0");
    mail.setSubject(subject);
    
    email = new helper.Email("hi@checkpulse.co", "Pulse")
    mail.setFrom(email);
    mail.setReplyTo(email);

    var request = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: mail.toJSON()
    });

    var self = this; 
    sg.API(request, function(error, response) {
      if (error) {
        console.log('error sending email ' + error + ' response is ' + JSON.stringify(response));
        return;
      } else {
        self.sent(self.inviteID);
      }
      return;
    })
  },
};

exports.process = function(email, inviteID, inviteTitle, cID, cTitle, tagID, tagTitle, fromID, fromName, toName, questions, sent) {
  new EmailSender(email, inviteID, inviteTitle, cID, cTitle, tagID, tagTitle, fromID, fromName, toName, questions, sent);
};

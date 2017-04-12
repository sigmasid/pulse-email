require('colors');
var helper = require('sendgrid').mail;
var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
var fbutil = require('./fbutil');

function EmailSender(email, inviteID, inviteTitle, cID, cTitle, tagID, tagTitle, fromID, fromName, toName, sent) {
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

  this._sendEmail();
}

EmailSender.prototype = {
  _toTitleCase: function(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
  },

  _sendEmail: function() {
    console.log("email is " + this.email);
    var to_email = new helper.Email(this.email);
    var subject = "Can you share your perspective on " + this.inviteTitle + "?";

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
    custom_arg = new helper.CustomArgs("type", "perspectives_invite");
    personalization.addCustomArg(custom_arg);

    let inviteLink = "https://tc237.app.goo.gl/?link=http://checkpulse.co/invite/" + this.inviteID + "&ibi=co.checkpulse.pulse&isi=1200702658";
    substitution = new helper.Substitution("%invite_link%", inviteLink);
    personalization.addSubstitution(substitution);

    let pulseLink = "https://tc237.app.goo.gl/?link=http://checkpulse.co/&ibi=co.checkpulse.pulse&isi=1200702658";
    substitution = new helper.Substitution("%pulse_link%", pulseLink);
    personalization.addSubstitution(substitution);

    let channelLink = "https://tc237.app.goo.gl/?link=http://checkpulse.co/c/" + this.cID + "&ibi=co.checkpulse.pulse&isi=1200702658";
    substitution = new helper.Substitution("%channel_link%", channelLink);
    personalization.addSubstitution(substitution);

    var mail = new helper.Mail();
    mail.addPersonalization(personalization);    
    mail.setTemplateId("41b6268c-495a-47a8-b67c-a3027ebb6786");
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

exports.process = function(email, inviteID, inviteTitle, cID, cTitle, tagID, tagTitle, fromID, fromName, toName, sent) {
  new EmailSender(email, inviteID, inviteTitle, cID, cTitle, tagID, tagTitle, fromID, fromName, toName, sent);
};

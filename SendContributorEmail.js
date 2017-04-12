require('colors');
var helper = require('sendgrid').mail;
var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
var fbutil = require('./fbutil');

function EmailSender(existing, emailTo, name, channel_name, channel_id, invite_id, sent) {
  this.existing = existing;
  this.emailTo = emailTo;
  this.name = name;
  this.channel_name = channel_name;
  this.invite_id = invite_id;
  this.channel_id = channel_id;
  this.sent = sent;
  this._sendEmail();
}

EmailSender.prototype = {
  _sendEmail: function() {
    var to_email = new helper.Email(this.emailTo);
    var subject = this.existing ? "Invitation to become a contributor in " + this.channel_name : "Invitation to join Pulse as a contributor in " + this.channel_name;

    var personalization = new helper.Personalization()
    substitution = new helper.Substitution("%name%", this.name);
    personalization.addSubstitution(substitution);
    substitution = new helper.Substitution("%channel_name%", this.channel_name);
    personalization.addSubstitution(substitution);
    substitution = new helper.Substitution("%channel_id%", this.channel_id);
    personalization.addSubstitution(substitution);
    substitution = new helper.Substitution("%invite_id%", this.invite_id);
    personalization.addSubstitution(substitution);
    personalization.addTo(to_email);
    custom_arg = new helper.CustomArgs("type", "contributor_invite");
    personalization.addCustomArg(custom_arg);

    let channelLink = "https://tc237.app.goo.gl/?link=http://checkpulse.co/c/" + this.channel_id + "&ibi=co.checkpulse.pulse&isi=1200702658";
    substitution = new helper.Substitution("%channel_link%", channelLink);
    personalization.addSubstitution(substitution);

    var mail = new helper.Mail();
    mail.addPersonalization(personalization);
    
    var templateID = this.existing ? "f2523841-3e69-4623-9eed-fe79cbc91b7a" : "45c2e4ea-d58e-43e4-bdce-cb3d22b12908";
    mail.setTemplateId(templateID);
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
        self.sent(self.invite_id);
      }
      return;
    })
  },
};

exports.process = function(existing, emailTo, name, channel_name, channel_id, invite_id, sent) {
  //existing = if the user is a member then we want to send them existing member email else option to create account
  new EmailSender(existing, emailTo, name, channel_name, channel_id, invite_id, sent);
};

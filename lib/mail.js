'use strict'

const mapOfToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class Mail {
  constructor(fs) {
    this.fs = fs;
  }
  createMessage(o) {
    return {
      from: 'noreply@game-kv.ru',
      to: o.to,
      subject: 'Восстановление пароля',
      text: `Чтобы восстановить пароль, перейдите по ссылке: http://game-kv.ru/password?token=${o.token}. Данная ссылка доступна в течение 24 часов.`,
      html: `Чтобы восстановить пароль, перейдите по ссылке: <a href="http://game-kv.ru/password?token=${o.token}">http://game-kv.ru/password?token=${o.token}</a><br><br>Данная ссылка доступна в течение 24 часов.`
    }
  }
  createToken(id, f = a => a) {
    let token = Date.now() + '_';
    for (let i = 0; i < 32; i++) {
      let index = Math.floor(Math.random() * mapOfToken.length);
   		token += mapOfToken[index];
  	}
    this.fs.writeFile(`${__dirname}/../db/mail/${token}`, id, err => {
      if (err) return console.log(err), f(err);
      f(null, token);
    });
  }
  checkToken(token, f = a => a) {
    const path = `${__dirname}/../db/mail/${token}`;
    this.fs.access(path, err => {
      if (err)
        f(2)
      else
        this.fs.readFile(path, 'utf8', (err, id) => {
          if (err) return console.log(err), f(1);
          try {
            const time = Date.now() - token.match(/\d+/)[0];
            if (time > 86400000) f(3)
            else f(null, +id);
          } catch(err) {
            console.log(err);
            f(1);
          }
        });
    });
  }
  deleteToken(token) {
    this.fs.unlink(`${__dirname}/../db/mail/${token}`, err => {
      if (err) console.log(err);
    });
  }
  send(o, func = err => err) {
    sgMail
      .send(this.createMessage(o))
      .then(() => {
        func(null);
      })
      .catch(error => {
        try {
          if (error.response.body.errors[0].field === 'personalizations.0.to.0.email') func(1)
          else func(2), console.log(error.response.body.errors);
        } catch(err) {
          console.log(err);
          func(3);
        }
      })
  }
  static include(fs) {
    return new Mail(fs);
  }
}

module.exports = Mail;

const nodemailer = require('nodemailer');

async function testGmail() {
  console.log('Connecting to Gmail SMTP via outstationcabsb@gmail.com...');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'outstationcabsb@gmail.com',
      pass: 'tnfwymqpnsqiqhnv'
    }
  });

  try {
    const info = await transporter.sendMail({
      from: '"CabBazar Security" <outstationcabsb@gmail.com>',
      to: 'lharsha031@gmail.com',
      subject: '🔐 847291 is your CabBazar Verification Code',
      text: 'Hi Harsha,\n\nYour CabBazar email verification code is: 847291\n\nValid for 10 minutes.'
    });
    console.log('SUCCESS! Real Gmail Response:', info.response);
    console.log('Message ID:', info.messageId);
  } catch (err) {
    console.error('FAILED TO SEND:', err);
  }
}

testGmail();

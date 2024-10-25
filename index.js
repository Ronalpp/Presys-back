import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import fs from 'fs';

dotenv.config();

const serviceAccount = JSON.parse(fs.readFileSync('./presys-b9912-firebase-adminsdk-48uak-cce984f2da.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'presys-b9912.appspot.com',
});

const bucket = admin.storage().bucket();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post('/teacher', upload.single('cv'), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).send('No se ha subido ningún archivo.');
  }

  const filePath = path.join('cv', file.originalname);
  const fileRef = bucket.file(filePath);

  try {
    await fileRef.save(file.buffer);

    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-09-2500',
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.DEFAULT_TO_EMAIL,
      subject: 'Nuevo CV recibido',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nuevo CV Recibido</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #2c3e50;
              border-bottom: 2px solid #3498db;
              padding-bottom: 10px;
            }
            strong {
              color: #2980b9;
            }
            .button {
              display: inline-block;
              padding: 10px 20px;
              background-color: #3498db;
              color: #ffffff;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
            }
            .button:hover {
              background-color: #2980b9;
            }
          </style>
        </head>
        <body>
          <h1>Nuevo CV recibido</h1>
          <p><strong>Email del usuario:</strong> ${req.body.email}</p>
          <p><strong>Nombre completo:</strong> ${req.body.fullName}</p>
          <p><strong>Número de identificación:</strong> ${req.body.idNumber}</p>
          <p><strong>Número de teléfono:</strong> ${req.body.phoneNumber}</p>
          <p><strong>Mensaje:</strong> ${req.body.message}</p>
          <p>Haga clic en el botón para descargar el CV:</p>
          <a href="${url}" class="button">Descargar CV</a>
        </body>
        </html>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).send('Error al enviar el correo: ' + error.toString());
      }
      res.status(200).send('Correo enviado: ' + info.response);
    });
  } catch (error) {
    return res.status(500).send('Error al subir el archivo: ' + error.message);
  }
});

app.post('/contact', async (req, res) => {
  const { email, fullName, phoneNumber, message } = req.body;

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.DEFAULT_TO_EMAIL,
      subject: `Nuevo mensaje de contacto de ${fullName}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nuevo Mensaje de Contacto</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              border-radius: 5px;
              padding: 20px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            h1 {
              color: #2c3e50;
              border-bottom: 2px solid #3498db;
              padding-bottom: 10px;
            }
            strong {
              color: #2980b9;
            }
            .message {
              background-color: #ecf0f1;
              border-left: 4px solid #3498db;
              padding: 10px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Nuevo Mensaje de Contacto</h1>
            <p><strong>Nombre completo:</strong> ${fullName}</p>
            <p><strong>Correo electrónico:</strong> ${email}</p>
            <p><strong>Número de teléfono:</strong> ${phoneNumber}</p>
            <div class="message">
              <strong>Mensaje:</strong>
              <p>${message}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).send('Error al enviar el correo: ' + error.toString());
      }
      res.status(200).send('Correo enviado: ' + info.response);
    });
  } catch (error) {
    res.status(500).send('Error al enviar el correo: ' + error.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
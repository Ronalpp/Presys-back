import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import fs from 'fs';

// Cargar variables de entorno
dotenv.config();

// Cargar y parsear el archivo JSON de credenciales de Firebase
const serviceAccount = JSON.parse(fs.readFileSync('./presys-b9912-firebase-adminsdk-48uak-cce984f2da.json', 'utf8'));

// Inicializar Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'presys-b9912.appspot.com', // Nombre del bucket directamente
});

// Inicializar el almacenamiento
const bucket = admin.storage().bucket();

const app = express();
const port = process.env.PORT || 3000;

// Middleware para manejar CORS
app.use(cors()); // Permitir CORS para todas las rutas

// Middleware para manejar archivos
const upload = multer({ storage: multer.memoryStorage() });

// Configurar el transporte de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Ruta para subir el CV y enviar el enlace
app.post('/upload-cv', upload.single('cv'), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).send('No se ha subido ningún archivo.');
  }

  const filePath = path.join('cv', file.originalname);
  const fileRef = bucket.file(filePath);

  try {
    // Subir archivo a Firebase Storage
    await fileRef.save(file.buffer);

    // Obtener el enlace público del archivo
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-09-2500', // Establecer una fecha de expiración lejana
    });

    // Enviar el enlace por correo electrónico con formato HTML
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Siempre enviar al correo definido en .env
      subject: 'Nuevo CV recibido',
      html: `
        <h1>Nuevo CV recibido</h1>
        <p><strong>Email del usuario:</strong> ${req.body.email}</p>
        <p><strong>Nombre completo:</strong> ${req.body.fullName}</p>
        <p><strong>Número de identificación:</strong> ${req.body.idNumber}</p>
        <p><strong>Número de teléfono:</strong> ${req.body.phoneNumber}</p>
        <p><strong>Mensaje:</strong> ${req.body.message}</p>
        <p>Aquí está el enlace para descargar el CV:</p>
        <a href="${url}">Descargar CV</a>
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

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

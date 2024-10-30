import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import admin from "firebase-admin";
import multer from "multer";
import path from "path";
import cors from "cors";
import fs from "fs";

dotenv.config();

const serviceAccount = JSON.parse(
  fs.readFileSync(
    "./emails-b760a-firebase-adminsdk-n709q-8f669fd93c.json",
    "utf8"
  )
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "emails-b760a.appspot.com",
});

const bucket = admin.storage().bucket();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:5173", // Cambia esto según la URL de tu frontend
  })
);

app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post("/teacher", upload.single("cv"), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).send("No se ha subido ningún archivo.");
  }

  const filePath = path.join("cv", file.originalname);
  const fileRef = bucket.file(filePath);

  try {
    await fileRef.save(file.buffer);

    const [url] = await fileRef.getSignedUrl({
      action: "read",
      expires: "03-09-2500",
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.DEFAULT_TO_EMAIL,
      subject: "Nuevo CV recibido",
      html: `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Propuesta de trabajo</title>
  </head>
  <body
    style="
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f0f4f8;
    "
  >
    <table
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      style="
        background-color: #ffffff;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      "
    >
      <tr>
        <td style="padding: 0">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td
                align="center"
                style="
                  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
                  padding: 30px 20px;
                "
              >
                <img
                  src="https://presys.vercel.app/assets/presys-CNwjRvPu.png"
                  alt="Logo de la empresa"
                  style="
                    max-width: 80px;
                    height: auto;
                    border-radius: 50%;
                    border: 3px solid #ffffff;
                  "
                />
              </td>
            </tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding: 30px">
                <h1
                  style="
                    color: #2c3e50;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 10px;
                    font-size: 28px;
                    margin-bottom: 20px;
                    text-align: center;
                  "
                >
                  ¡Propuesta de trabajo!
                </h1>

                <div
                  style="
                    background-color: #f8f9fa;
                    border-radius: 15px;
                    padding: 20px;
                    margin-bottom: 20px;
                  "
                >
                  <p style="margin-bottom: 10px">
                    <strong style="color: #2980b9"> Email:</strong>
                    ${req.body.email}
                  </p>
                  <p style="margin-bottom: 10px">
                    <strong style="color: #2980b9"> Nombre:</strong>
                    ${req.body.fullName}
                  </p>
                  <p style="margin-bottom: 10px">
                    <strong style="color: #2980b9"> Identificación:</strong>
                    ${req.body.idNumber}
                  </p>
                  <p style="margin-bottom: 10px">
                    <strong style="color: #2980b9"> Teléfono:</strong>
                    ${req.body.phoneNumber}
                  </p>
                  <p style="margin-bottom: 0">
                    <strong style="color: #2980b9"> Mensaje:</strong>
                    ${req.body.message}
                  </p>
                </div>

                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td align="center">
                      <a
                        href="${url}"
                        style="
                          display: inline-block;
                          padding: 14px 28px;
                          background: linear-gradient(
                            135deg,
                            #0401ff 0%,
                            #312fcd 100%
                          );
                          color: #ffffff;
                          text-decoration: none;
                          border-radius: 50px;
                          font-weight: bold;
                          text-transform: uppercase;
                          letter-spacing: 1px;
                          transition: all 0.3s;
                          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                        "
                        >Descargar CV</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res
          .status(500)
          .send("Error al enviar el correo: " + error.toString());
      }
      res.status(200).send("Correo enviado: " + info.response);
    });
  } catch (error) {
    return res.status(500).send("Error al subir el archivo: " + error.message);
  }
});

app.post("/contact", async (req, res) => {
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
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Contacto</title>
  </head>
  <body
    style="
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f0f4f8;
    "
  >
    <table
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      style="
        background-color: #ffffff;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      "
    >
      <tr>
        <td style="padding: 0">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td
                align="center"
                style="
                  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
                  padding: 30px 20px;
                "
              >
                <img
                  src="https://presys.vercel.app/assets/presys-CNwjRvPu.png"
                  alt="Logo de la empresa"
                  style="
                    max-width: 80px;
                    height: auto;
                    border-radius: 50%;
                    border: 3px solid #ffffff;
                  "
                />
              </td>
            </tr>
          </table>

          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding: 30px">
                <h1
                  style="
                    color: #2c3e50;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 10px;
                    font-size: 28px;
                    margin-bottom: 20px;
                    text-align: center;
                  "
                >
                  ¡Contacto!
                </h1>

                <div
                  style="
                    background-color: #f8f9fa;
                    border-radius: 15px;
                    padding: 20px;
                    margin-bottom: 20px;
                  "
                >
                  <p style="margin-bottom: 10px">
                    <strong style="color: #2980b9"> Email:</strong>
                    ${email}
                  </p>
                  <p style="margin-bottom: 10px">
                    <strong style="color: #2980b9"> Nombre:</strong>
                    ${fullName}
                  </p>
                  <p style="margin-bottom: 10px">
                    <strong style="color: #2980b9"> Teléfono:</strong>
                    ${phoneNumber}
                  </p>
                  <p style="margin-bottom: 0">
                    <strong style="color: #2980b9"> Mensaje:</strong>
                    ${message}
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res
          .status(500)
          .send("Error al enviar el correo: " + error.toString());
      }
      res.status(200).send("Correo enviado: " + info.response);
    });
  } catch (error) {
    res.status(500).send("Error al enviar el correo: " + error.message);
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

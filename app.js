const express = require('express');
const cors = require('cors');
const pdf = require('html-pdf');
const AWS = require('aws-sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8888;

// Configure AWS SDK with your credentials
AWS.config.update({
  accessKeyId: 'AKIAZQ3DOY4LLV3D5E7N',
  secretAccessKey: 'E0rlMNQohdhiuj+0Ig09lKwebssb5In6wK9JlzBe',
  region: 'ap-south-1'
});

const s3 = new AWS.S3();

// Middleware to parse JSON in request body
app.use(cors());
app.use(express.json());
// Serve static files from the 'images' directory
app.use('/images', express.static('images'));

// API route to generate PDF from HTML content
app.post('/generate-pdf', async (req, res) => {
  console.log("request body ", req.body);
  // Extract data from request body
  const { patients, date, doctorName } = req.body;

  // const imagePath = await import(`./images/wiziologo.png`);
  // console.log("image path ", imagePath);
  // const logo = imagePath.default;
  // Construct HTML content dynamically
  let htmlContent = `
    <html>
      <style>
        /* Table styling */
        table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 15px;
          overflow: hidden;
          border: 1px solid #ddd;
        }
        th, td {
          padding: 12px 15px;
          text-align: left;
          border: 1px solid #ddd;
        }
        th {
          /* background-color: #f2f2f2; */
        }
        tr:nth-child(even) {
          background-color: #EFF1FF;
        }
        /* Radius only on the outer border */
        table tr:first-child th:first-child {
          border-top-left-radius: 15px;
        }
        table tr:first-child th:last-child {
          border-top-right-radius: 15px;
        }
        table tr:last-child td:first-child {
          border-bottom-left-radius: 15px;
        }
        table tr:last-child td:last-child {
          border-bottom-right-radius: 15px;
        }
      </style>
      <body style="font-family: Calibri; padding: 5%;">
        <div style="font-alingment: right;">
          <div style="font-size: 35px; margin-top: 10px;">Wizio</div>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 3%; font-size: 20px;">
          <div>${doctorName} <br>Date: ${date}</div>
          <div>Total Patients : ${patients.length}</div>
        </div>
        <br><br>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Time</th>
              <th>Duration</th>
              <th>Appointment</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>`;

  // Populate table rows with patient data
  patients.forEach((patient, index) => {
    htmlContent += `
            <tr>
              <td>${index + 1}</td>
              <td>${patient.patientName}</td>
              <td>${patient.patientNumber}</td>
              <td>${patient.appointmentStartTime}</td>
              <td>${patient.slotDuration} minutes</td>
              <td>${patient.appointmentType}</td>
              <td></td>
            </tr>`;
  });

  // Close HTML tags
  htmlContent += `
          </tbody>
        </table>
      </body>
    </html>`;

  // Create PDF options
  const pdfOptions = { format: 'A4' }; // You can adjust the format as needed

  try {
    // Convert HTML to PDF
    const buffer = await new Promise((resolve, reject) => {
      pdf.create(htmlContent, pdfOptions).toBuffer((err, buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });

    // Combine doctorName and date for the PDF file name
    const fileName = `${doctorName}_${date.replace(/-/g, '')}`;

    // Generate the key for the PDF file
    const key = `pdf/${fileName}_${Date.now()}.pdf`;

    // Upload the PDF buffer to S3 bucket
    const uploadParams = {
      Bucket: 'wizio-pdf',
      Key: key, // Unique key for the PDF file
      Body: buffer,
      ContentType: 'application/pdf'
    };
    const uploadResult = await s3.upload(uploadParams).promise();
    console.log("this is upload result ", uploadResult);

    // Generate presigned URL for viewing the PDF
    const urlParams = {
      Bucket: 'wizio-pdf',
      Key: uploadParams.Key,
      Expires: 60 * 60 * 24 // URL expires in 24 hours
    };
    const presignedUrl = await s3.getSignedUrl('getObject', urlParams);
    console.log("this is url ", presignedUrl);

    // Send the presigned URL as response
    return res.json({ url: presignedUrl });
  } catch (error) {
    console.error('Error generating PDF or uploading to S3:', error);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
});


// Route to show that API is running
app.get('/', (req, res) => {
  res.send('API is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

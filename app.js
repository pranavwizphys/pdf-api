const express = require('express');
const cors = require('cors');
const { PDFDocument, rgb } = require('pdf-lib');
const AWS = require('aws-sdk');

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

// API route to generate PDF from data
app.post('/generate-pdf', async (req, res) => {
  console.log("request body ", req.body);
  // Extract data from request body
  const { patients, date, doctorName } = req.body;

  try {
    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    // Set font and font size
    // const font = await pdfDoc.embedFont(PDFDocument.Font.Helvetica);
    // page.setFont(font);
    // page.setFontSize(14);
    
    // Add Wizio text
    page.drawText('Wizio', { x: 500, y: 750, size: 20 });

    // Add text content
    page.drawText(`Doctor: ${doctorName}`, { x: 10, y: 720, size: 10 });
    page.drawText(`Date: ${date}`, { x: 10, y: 700, size: 10 });
    page.drawText(`Total Patients: ${patients.length}`, { x: 10, y: 680, size: 10 });
    // page.drawText('Patient Details:', { x: 10, y: 660, size: 10 });

    // Add table headers
    page.drawText('No', { x: 10, y: 620, size: 10 });
    page.drawText('Name', { x: 60, y: 620, size: 10 });
    page.drawText('Contact', { x: 150, y: 620, size: 10 });
    page.drawText('Time', { x: 230, y: 620, size: 10 });
    page.drawText('Duration', { x: 310, y: 620, size: 10 });
    page.drawText('Appointment', { x: 400, y: 620, size: 10 });
    page.drawText('Remarks', { x: 490, y: 620, size: 10 });
    page.drawLine({start: { x: 10, y: 614 }, end: { x: 580, y: 614 }, thickness: 0.001});

    // Add patient details to the table
    let yOffset = 600;
    let alternateColor = true;
    patients.forEach((patient, index) => {
      if (alternateColor) {
        // page.setFillColor(rgb(0.8, 0.8, 0.8));
        // page.fillRect(10, yOffset - 20, 540, 20);
      }
      page.drawText(`${index + 1}`, { x: 10, y: yOffset, size: 10 });
      page.drawText(`${patient.patientName}`, { x: 60, y: yOffset, size: 10 });
      page.drawText(`${patient.patientNumber}`, { x: 150, y: yOffset, size: 10 });
      page.drawText(`${patient.appointmentStartTime}`, { x: 230, y: yOffset, size: 10 });
      page.drawText(`${patient.slotDuration} minutes`, { x: 310, y: yOffset, size: 10 });
      page.drawText(`${patient.appointmentType}`, { x: 400, y: yOffset, size: 10 });
      page.drawText('', { x: 490, y: yOffset, size: 10 }); // Add remarks, if available
      // page.drawLine({start: { x: 10, y: 640 }, end: { x: 550, y: 640 }});

      yOffset -= 20;
      alternateColor = !alternateColor;
    });
    
    const options = { scale: 0.1 }; // Adjust the scale as needed (0.5 means 50% smaller)

    const pdfBytes = await pdfDoc.save({ options });
    
    // Serialize the PDF document
    // const pdfBytes = await pdfDoc.save();

    // Combine doctorName and date for the PDF file name
    const fileName = `${doctorName}_${date.replace(/-/g, '')}`;

    // Generate the key for the PDF file
    const key = `pdf/${fileName}_${Date.now()}.pdf`;

    // Upload the PDF buffer to S3 bucket
    const uploadParams = {
      Bucket: 'wizio-pdf',
      Key: key, // Unique key for the PDF file
      Body: pdfBytes,
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



// API route to generate PDF from the provided program data
app.post('/generate-program-pdf', async (req, res) => {
  console.log("request body ", req.body);
  // Extract program data from request body
  const programs = req.body;

  try {
    // Create new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    // Set font and font size
    const font = await pdfDoc.embedFont(PDFDocument.Font.Helvetica);
    page.setFont(font);
    page.setFontSize(14);

    // Add Wizio text
    page.drawText('Wizio', { x: 500, y: 750, size: 20 });

    // Add table headers
    page.drawText('Code', { x: 10, y: 720, size: 12 });
    page.drawText('Name', { x: 100, y: 720, size: 12 });
    page.drawLine({ start: { x: 10, y: 710 }, end: { x: 580, y: 710 }, thickness: 0.001 });

    // Add program details to the table
    let yOffset = 690;
    programs.forEach((program) => {
      page.drawText(`${program.code}`, { x: 10, y: yOffset, size: 10 });
      page.drawText(`${program.name}`, { x: 100, y: yOffset, size: 10 });

      yOffset -= 20;
    });

    const options = { scale: 0.1 }; // Adjust the scale as needed

    const pdfBytes = await pdfDoc.save({ options });

    // Combine a timestamp for the PDF file name
    const fileName = `programs_${Date.now()}`;

    // Generate the key for the PDF file
    const key = `program_pdf/${fileName}.pdf`;

    // Upload the PDF buffer to S3 bucket
    const uploadParams = {
      Bucket: 'wizio-pdf',
      Key: key, // Unique key for the PDF file
      Body: pdfBytes,
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

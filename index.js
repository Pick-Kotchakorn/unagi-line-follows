// index.js

const express = require('express');
const line = require('@line/bot-sdk');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// --- ⚙️ 1. ส่วนตั้งค่า (กรอกข้อมูลของคุณที่นี่) ---

// ตั้งค่า LINE
const config = {
    channelAccessToken: 'pK1ISEv3EpisSPdg2+LL5GNOWT9jpB9w4Q0CDMfAtp1KCZDM8yGeBvxTf7M6TwT/kTWEJ/3ZyZ5kEqvz8ZezZ2PSAP8cjipmu+n0yH1lxtRWscYYxah2S78+mPvy8yxCgo3B+QwrBLDzXztjvOQDWgdB04t89/1O/w1cDnyilFU=', // <<< ใส่ Channel Access Token ของคุณ
    channelSecret: 'd108a59f7374d4a13eea586456ca9696'           // <<< ใส่ Channel Secret ของคุณ
};

// ตั้งค่า Google Sheet
const SPREADSHEET_ID = '1eGTIcbeHfv8X26rTM2HW4qsvHFedYsmIne2XqStbfIE'; // <<< ใส่ Spreadsheet ID ของคุณ
const creds = require('./credentials.json'); // <<< ตรวจสอบว่าไฟล์ credentials.json อยู่ในโฟลเดอร์เดียวกับไฟล์นี้
const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

// --- 🤖 2. ส่วนโค้ดการทำงานของบอท ---

const client = new line.Client(config);
const app = express();

// Endpoint หลักสำหรับรับ Webhook จาก LINE
app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

// ฟังก์ชันสำหรับจัดการแต่ละ Event
async function handleEvent(event) {
    // Event: มีคนเพิ่มเพื่อน
    if (event.type === 'follow') {
        try {
            const userId = event.source.userId;
            const profile = await client.getProfile(userId);
            
            const userData = {
                Timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
                userId: userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl,
                statusMessage: profile.statusMessage,
                language: profile.language,
            };
            
            console.log('✅ New Follower:', userData.displayName);
            await saveToGoogleSheets('Users', userData); // บันทึกลงชีท 'Users'
        } catch (error) {
            console.error('Error on follow event:', error);
        }
    }

    // Event: มีคนส่งข้อความ
    if (event.type === 'message' && event.message.type === 'text') {
        try {
            const chatData = {
                Timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
                userId: event.source.userId,
                message_type: event.message.type,
                message_text: event.message.text,
            };

            console.log('✉️ New Message:', chatData.message_text);
            await saveToGoogleSheets('ChatHistory', chatData); // บันทึกลงชีท 'ChatHistory'
        } catch (error)
        {
            console.error('Error on message event:', error);
        }
    }
}

// ฟังก์ชันสำหรับบันทึกข้อมูลลง Google Sheet
async function saveToGoogleSheets(sheetTitle, dataRow) {
    try {
        await doc.useServiceAccountAuth(creds);
        await doc.loadInfo(); 

        const sheet = doc.sheetsByTitle[sheetTitle];
        if (sheet) {
            await sheet.addRow(dataRow);
        } else {
            console.error(`Sheet "${sheetTitle}" not found!`);
        }
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
    }
}

// สั่งให้ Server เริ่มทำงาน
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is listening on port ${port}...`);
});
// importing modules
const { google } = require('googleapis');
const fileSystem = require('fs');
const read = require('readline');
const { promisify } = require('util');
const sleep = promisify(setTimeout);


const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const token = 'token.json';
const CREDENTIALS_PATH = 'C:/Users/arvin/Arvind_gmail/client_secret_339569796044-71s9fit1oivldkj635jd5mv2sudp74ug.apps.googleusercontent.com.json';

async function authorization() {
  // loading credentials 
  const credentials = require(CREDENTIALS_PATH);

  const { client_secret, client_id, redirect_uris } = credentials.installed;
  // creating an OAuth2 client 
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]
  );

  try {
    
    const token = fileSystem.readFileSync(token);
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } catch (err) {
    return getNewToken(oAuth2Client);
  }
}
// obtain a new OAuth 2.0 token
async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorizzation: ', authUrl);

  // interface 
  const rl = read.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // make the user to enter the authorization code
  const code = await new Promise(resolve => {
    rl.question('ENTER the code: ', (code) => {
      rl.close();
      resolve(code);
    });
  });

  // get tokens 
  const { tokens } = await oAuth2Client.getToken(code);
  // setting the obtained tokens 
  oAuth2Client.setCredentials(tokens);
  fileSystem.writeFileSync(token, JSON.stringify(tokens));
  return oAuth2Client;
}

// listing messages in a Gmail 
async function listMessages(auth, label) {
  const gmail = google.gmail({ version: 'v1', auth });
  // requesting a list of messages received
  const response = await gmail.users.messages.list({
    userId: 'me',
    labelIds: [label],
  });

  return response.data.messages;
}

// sending an auto-reply 
async function sendAutoReply(auth, messageId) {
  const gmail = google.gmail({ version: 'v1', auth });
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
  });

  // fetching the subject 
  const subject = response.data.payload.headers.find(header => header.name === 'Subject').value;
  if (!subject.includes('Re:')) {
    // constructing my reply 
    const body = 'HI this is Arvind! thanks for the message and i will be AVAILABLE soon.';

    // Sending my reply
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: Buffer.from(`To: ${response.data.payload.headers.find(header => header.name === 'From').value}\r\n` +
          `Subject: Re: ${subject}\r\n\r\n${body}`).toString('base64'),
      },
    });
    console.log(`Auto-reply : ${response.data.payload.headers.find(header => header.name === 'From').value}`);
  }
}

// main func
async function main() {
  try {
    // Authorization
    const auth = await authorization();
    const label = 'Arvind reply';
    await google.gmail({ version: 'v1', auth }).users.labels.create({
      userId: 'me',
      requestBody: {
        name: label,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      },
    });

    // check for new emails 
    while (true) {
        // get a list of messages
        const messages = await listMessages(auth, 'INBOX');
  
        
        for (const message of messages) {
          await sendAutoReply(auth, message.id);
          await sleep(Math.floor(Math.random() * (30000 - 10000)) + 10000);
        }
      }
    } catch (err) {
      
      console.error('Error:', err.message);
    }
  }

  main();
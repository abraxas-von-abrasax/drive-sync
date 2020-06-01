import { config } from 'dotenv';
import fs from 'fs';
import readline from 'readline';
import { google } from 'googleapis';

config();

// If modifying these scopes, delete token.json.
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata'
];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const token = {
    installed: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uris: ['http://localhost:4000']
    }
}

authorize(token, listFiles);

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials: any, callback: Function) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token.toString('utf8')));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {callback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client: any, callback: Function) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err: any, token: any) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

interface DriveData {
    data: Array<{ name: string; id: string }>;
    nextPageToken?: string;
}

async function getPage(auth: any, pageToken?: string): Promise<DriveData> {
    return new Promise<any>((resolve, reject) => {
        const drive = google.drive({ version: 'v3', auth });
        drive.files.list(
            { pageSize: 10, fields: 'nextPageToken, files(id, name)', pageToken },
            (err: any, res: any) => {
                if (err) {
                    reject(`'The API returned an error: ${err}.`);
                    return;
                }

                const files = res.data.files;

                if (files.length) {
                    const driveData = {
                        nextPageToken: res.data.nextPageToken,
                        data: files.map((file: any) => ({ name: file.name, id: file.id }))
                    };
                    resolve(driveData);
                    return;
                }
                reject('No files found.')
            });
    });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listFiles(auth: any): Promise<void> {
    let pageToken: string | undefined = undefined;
    do {
        const result: DriveData = await getPage(auth, pageToken);
        result.data.map(file => console.log(`${file.name} (${file.id}`));
        pageToken = result.nextPageToken;
    } while (pageToken);
}

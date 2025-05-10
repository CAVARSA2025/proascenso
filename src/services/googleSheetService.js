import path from 'path';
import { google } from 'googleapis';

const sheets = google.sheets('v4');

async function addRowToSheet(auth, spreadsheetId, values) {
    const request = {
        spreadsheetId,
        range: 'chatbot',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
            values: [values],
        },
        auth,
    };

    console.log('Agregando fila a Google Sheets:', values);

    try {
        const response = await sheets.spreadsheets.values.append(request);
        return response;
    } catch (error) {
        console.error('Error al agregar fila a Google Sheets:', error);
        throw error;
    }
}

const appendToSheet = async (data) => {
    try {
        const authClient = new google.auth.JWT(
            process.env.GOOGLE_CLIENT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/spreadsheets']
        );

        const spreadsheetId = '1OH4-THo5YAnbzxuqYVItBNUTZO63MUsNiBDaMbmt9SY';

        await addRowToSheet(authClient, spreadsheetId, data);
        return 'Datos correctamente agregados';
    } catch (error) {
        console.error('Error al agregar datos:', error);
    }
};

export default appendToSheet;

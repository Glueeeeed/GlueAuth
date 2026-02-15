import express, { Request, Response } from 'express';
import path from "path";
import cors from 'cors';
import {ZKP} from './utils/zkp'
import {Identity} from "@semaphore-protocol/identity";
import https from 'https';


//Uncomment when httpsMode is enabled
// import {options} from "./config/ssl";

import {corsEnabled, httpsMode, PORT, domain} from "./configs/settings";

// Import Routes

import keyenchange from "./routes/keyenchange";
import auth from "./routes/auth";
import {numberToHexUnpadded} from "@noble/curves/utils.js";



// initialize Merkle Tree
export const zkp = new ZKP();
zkp.initializeGroup();



const app = express();
const port : number = PORT;


//Uncomment when httpsMode is enabled

// const ssl = options


//Middlewares
app.use(express.json());
if (corsEnabled) {
    const corsOptions = {
        origin: domain,
        credentials: true,
        optionsSuccessStatus: 200,
    };
    app.use(cors());
}



// Frontend handling

app.use(express.static(path.join(__dirname, 'public')));

app.get('/gluecrypt/auth/register', (req: Request, res: Response)  => {
    res.sendFile(path.join(__dirname, 'public', '/dist' ,'register.html'));
})

// API endpoints

app.use('/api', keyenchange);
app.use('/api/zkp/auth', auth);






if (httpsMode) {

    // https.createServer(ssl, app).listen(port, "0.0.0.0", () => {
    //
    //     console.log(`App running at ${domain}:${port}`);
    //
    // });

} else {
    app.listen(port, () => {
        console.log(`App running at ${domain}:${port}`);

    });

}




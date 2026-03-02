import express, { Request, Response } from 'express';
import path from "path";
import cors from 'cors';
import {ZKP} from './utils/zkp'
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import https from 'https';


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many request."
});



//Uncomment when httpsMode is enabled
// import {options} from "./config/ssl";

import {corsEnabled, httpsMode, PORT, domain} from "./config/settings";

// Import Routes

import keyenchange from "./routes/keyenchange";
import auth from "./routes/auth";
import Zkp from "./routes/zkp";
import {secured} from "./middlewares/auth";


// initialize Merkle Tree
export const zkp = new ZKP();
zkp.initializeGroup();



const app = express();
const port : number = PORT;


//Uncomment when httpsMode is enabled

// const ssl = options


//Middlewares
app.use(express.json());
app.use(cookieParser());
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

app.get('/gluecrypt/register', (req: Request, res: Response)  => {
    res.sendFile(path.join(__dirname, 'public' ,'register.html'));
})

app.get('/gluecrypt/login', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public' ,'login.html'));
})

app.get('/gluecrypt/zkp-info', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public' ,'zkp-info.html'));
})

app.get('/gluecrypt', secured ,(req: Request, res: Response) => {
    res.send("Ok");
})

// API endpoints

app.use('/api', limiter, keyenchange);
app.use('/api/zkp/auth', limiter, auth);
app.use('/api/zkp', limiter, Zkp)






if (httpsMode) {

    // https.createServer(ssl, app).listen(port, "0.0.0.0", () => {
    //
    //     console.log(`App running at ${domain}:${port}`);
    //
    // });

} else {
    app.listen(port, () => {
        console.log(`App running at ${domain}:${port + "/gluecrypt"}`);

    });

}




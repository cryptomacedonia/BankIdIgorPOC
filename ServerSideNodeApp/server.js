// @ts-check
const qrcode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs');
const JSONdb = require('simple-json-db');
const db = new JSONdb('./database.json');
const express = require('express');
const app = express();
const appReact = express();
const https = require('https');
const fetch = require('node-fetch');
const cookieParser = require("cookie-parser");
const sessions = require('express-session');
const { createRequire } = require('module');
const path = require("path");
const ao = new https.Agent({
    pfx: require('fs').readFileSync('./FPTestcert3_20200618.pfx'),
    passphrase: 'qwerty123',
    ca: require('fs').readFileSync('./test.ca')
    //rejectUnauthorized: false // works if not presenting a CA cert but BAD! - we'd risk MITM
}); 
// if (!db.get("config").url.includes("localhost")) {
// appReact.get("/client", (req, res) => {
//  res.sendFile(path.join(__dirname, "public", "index.html"));
// });
appReact.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
  //  res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});
appReact.use(express.static("public"));
// }
const oneminute = 1000 * 10;
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
  //  res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneminute },
    resave: false 
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/auth', async (req, res) => {

   
    let session=req.session;
    if(session){
       // res.json('auth continuing...')
      //  res.send("Welcome User <a href=\'/logout'>click to logout</a>");
    }else {
     //   res.json('new auth session')
 //   res.send("no session...")
}

    
    var ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
    ip = "192.168.100.231"
    console.log(req.connection.remoteAddress);
    var bodyObj = {
          "endUserIp": ip // TODO: must be client ip as seen been by RP
      }
      if (req.query.pnr) {
          bodyObj.personalNumber = req.query.pnr
      }
    let data = await fetch('https://appapi2.test.bankid.com/rp/v5.1/auth', {
        method: 'POST',
        body: JSON.stringify(bodyObj),
        headers: {
            'content-type': 'application/json'
        },
        agent: ao
    });
    data = await data.json();
    console.log(data);
    let orderRef;
    if (data.orderRef) orderRef = data.orderRef; 
   res.setHeader('set-cookie', 'orderRef='+orderRef+';max-age=30000');
   res.setHeader('set-cookie', 'orderRefCreation='+Math.round((new Date()).getTime() / 1000)+';max-age=30000');
    //res.json('http://127.0.0.1:3002/collect?or=' + orderRef);
    db.set(orderRef,data)
    let collectUrl  = db.get("config").url+':3002/collect?or=' + orderRef+"&"+"time="+Math.round((new Date()).getTime() / 1000)
    let qrCodeUrl = db.get("config").url+':3002/qrcode?or=' + orderRef
    res.send({collectUrl:collectUrl, qrCodeUrl:qrCodeUrl, orderRef:orderRef,autoStartToken:data.autoStartToken});
    
});


app.get('/qrcode', async (req, res) => {
    //  RP should keep on calling collect every two seconds as long as status indicates pending. RP must abort if status indicates failed
    let orderRef = req.query.or;
   res.json({qrcode:db.get(orderRef).qrcode})
})

app.get('/getAuthStateForOrderRef', async (req, res) => {
    //  RP should keep on calling collect every two seconds as long as status indicates pending. RP must abort if status indicates failed
    let orderRef = req.query.or;
    let dbEntry = db.get(orderRef)
    
    if (dbEntry) {
   res.json(dbEntry.completionData)
    } else {
        res.json({})
    } 
})



app.get('/collect', async (req, res) => {
    //  RP should keep on calling collect every two seconds as long as status indicates pending. RP must abort if status indicates failed
    let orderRef = req.query.or;
    let orderRefCreation  = req.query.time;
    let data = await callCollect(orderRef,orderRefCreation);
    console.log(data);
    res.json({"status":data.status, "completionData": data.completionData})
})

app.get('/cancel', async (req, res) => {
    //  RP should keep on calling collect every two seconds as long as status indicates pending. RP must abort if status indicates failed
    let orderRef = req.query.or;
    let data = await callCancel(orderRef);
    console.log(data);
    res.json({})
})





const callCancel = async (orderRef) => {

    let data = await fetch('https://appapi2.test.bankid.com/rp/v5.1/cancel', {
        method: 'POST',
        body: JSON.stringify({
            "orderRef": orderRef
        }),
        headers: {
            'content-type': 'application/json'
        },
        agent: ao
    }).catch((error)=> {
    console.log(error)
    }
    );
    data = await data.json();
    console.log("CANCEL RESPONSE for ORDER REF:",orderRef,data);
    return data
    
};

const callCollect = async (orderRef,orderRefCreation = null) => {
    let data = await fetch('https://appapi2.test.bankid.com/rp/v5.1/collect', {
        method: 'POST',
        body: JSON.stringify({
            "orderRef": orderRef
        }),
        headers: {
            'content-type': 'application/json'
        },
        agent: ao
    });
    data = await data.json();
    console.log(data);

    if ( data.errorCode)  data.hintCode = data.errorCode
    if (data.hintCode) { // TODO: must abort if status indicates failed
        // call again for non failed statuses
        if (data.hintCode != 'expiredTransaction' && // msg RFA8
            data.hintCode != 'certificateErr' && // msg RFA16
            data.hintCode != 'userCancel' && // msg RFA6
            data.hintCode != 'cancelled' && // msg RFA3
            
            data.hintCode != 'startFailed' && data.errorCode != 'invalidParameters'  ) { // msg RFA17
            console.log('set timeout');
            if (data.hintCode == 'noClient' || data.hintCode == 'outstandingTransaction') {

                let orderRef = data.orderRef
               let tokens =  db.get(orderRef)
               if (orderRef) {
                   console.log("orderRefCreation",orderRefCreation)
                createQrCode(orderRef,tokens.qrStartSecret,tokens.qrStartToken,orderRefCreation)
               }

            }
            return await sleep(callCollect, orderRef,orderRefCreation);
          
        } else {

            console.log('fail, return'); // msg RFA22

            return data;
        }
    } else {
        db.set(orderRef,data)
        console.log('return data', data);
        return data;
    }
    
};
const createQrCode = (orderRef, qrStartSecret,qrStartToken,orderRefCreation) => {
  let seconds = Math.round( Math.round((new Date()).getTime() / 1000) - orderRefCreation)

console.log("SECS:",seconds)
let hmac = crypto.createHmac('sha256', qrStartSecret);
hmac.update(seconds+"");
const qrAuthCode = hmac.digest('hex');
const qrString = "bankid." + qrStartToken + "." + seconds + "." + qrAuthCode
console.log("QRString:",qrString)
const qrOption = { 
  margin : 7,
  width : 500
};

console.log("qrString:",qrString)
db.set(orderRef,{...db.get(orderRef), qrcode: qrString })
return qrString

}
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(fn, ...args) {
    await timeout(2000);
    return await fn(...args);
}

const port = process.env.PORT || 3002;
const portReact = process.env.PORT || 3003;
app.listen(port, () => console.log(`App listening on port ${port}!`));
appReact.listen(portReact, () => console.log(`React Client listening on port ${portReact}!`));
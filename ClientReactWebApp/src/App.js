import logo from './logo.svg';
import Button from 'react-bootstrap/Button';
// import { w3cwebsocket as WebSocket } from "websocket";
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import './App.css';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from "react-dom";
import QRCode from "react-qr-code";
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import { useSearchParams, setSearchParams } from "react-router-dom";

// import LoginScreen from './LoginScreen'

let url =  "http://161.97.97.205" //server e-menu
//let url =  "http://localhost" // client dev

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderRef =  searchParams.get("or")
  useEffect(() => {
    if (orderRef) {
      setTimeout(()=>{
      console.log("trying to get authorized session from server.....", orderRef);
      axios.get(url+":3002/getAuthStateForOrderRef?or="+orderRef)
      .then((data) => {
       // console.log(data);
      if (Object.keys(data.data).length === 0) {
        setState({...state,stage:Status.FAILED})
      } else {
  
        setState({...state,stage:Status.COMPLETED, loggedInData:{completionData:data.data}})
      }
      });
    }, 1500);
    }
  }, [orderRef]);

  





  // var timeout = 250;

  // }


 // let params = queryString.parse(props.location.search)

  const LoginScreen = () => {


    return (
      <>
        <h3>Sign In with BankID</h3>
        <Button onClick={() => authOnThisDevice()} variant="primary" style={{ width: "400px" }}>Sign in on this device</Button>
        <br></br>
        <Button onClick={() => authOnDifferentDeviceWithQrCode()} variant="primary" style={{ width: "400px" }}>Sign with qr code</Button>
      </>
    );


  }

  const QRCodeComponent = () => {


    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label>"Please scan QR code from another device"</label>
        <br /><br />
        <QRCode value={state.qrcode} />
        <Button onClick = {()=> {
            axios.get(url+":3002/cancel?or="+state.orderRef)
            .then((data) => {
             // console.log(data);
            if (Object.keys(data.data).length === 0) {
              setState({...state,stage:Status.FAILED})
            }
            });


        }}>Cancel</Button>
      </div>

    );


  }

  const CompletedFlow = () => {


    return (

      <header>Thanks for loggin in {state.loggedInData.completionData.user.name}!</header>

    );


  }
  const FailedFlow = () => {


    return (
<>
      <header>Error Occured Please try again!</header>
      <Button onClick={()=>setState({...state,stage:Status.READY})} >Restart Sign in</Button>
      </>
    );


  }





  const authOnThisDevice = () => {
    // wsConnect()
    //  handleClickSendMessage()
    console.log("auth on this device flow started....")
    axios.get(url+":3002/auth")
      .then((data) => {
        console.log(data);
        window.location.assign("https://app.bankid.com/?autostarttoken=" + data.data.autoStartToken + "&redirect="+url+":3000?or="+data.data.orderRef)
        axios.get(data.data.collectUrl).then((d) => {
      
        })

      });


  }



  const authOnDifferentDeviceWithQrCode = () => {

    console.log("auth on different device with qr code flow started...")

    axios.get(url+":3002/auth")
      .then((data) => {
        console.log(data)

        setState({ ...state,stage:Status.QRFLOWACTIVE, orderRef: data.data.orderRef })
console.log("collect url....",data.data.collectUrl)
        axios.get(data.data.collectUrl).then((d) => {
          console.log("after collect:", d)
          if (d.data.status == 'complete') {

            setState({ ...state, stage:Status.COMPLETED,  loggedInData: d.data })

          } else {

            setState({ ...state, stage:Status.FAILED, status: d.data.status })
          }


        }
        ).catch((error) =>  setState({ ...state, stage:Status.FAILED }))

      }
      )


      .catch((error) =>
        setState({ ...state, stage:Status.FAILED })
      )





  }

  useInterval(() => {
    if (state.stage == Status.QRFLOWACTIVE) {
      axios.get(url+":3002/qrcode?or=" + state.orderRef)
        .then((data) => {

          console.log(data)
          if (data.data.qrcode) {
            setState({ ...state, qrcode: data.data.qrcode, notice: "scan the qr code..." })
          }

        }
        ).catch((error) =>
          console.log(error)
        )
    }
  }, 1000);
  const Status = {
    READY: 1,
    QRFLOWACTIVE: 2,
    COMPLETED: 3,
    FAILED: 4
  };
  const [state, setState] = useState(
    {
      stage: Status.READY,
      status: "start",
      // notice:"Please scan the code...", 
      qrcode: "fsdsdfasdfasdfsdf"
    })
  console.log(state)

  let component = null;
  switch (state.stage) {
    case Status.READY:
      component = <LoginScreen></LoginScreen>;
      break;
    case Status.QRFLOWACTIVE:
      component = <QRCodeComponent></QRCodeComponent>;
      break;
    case Status.COMPLETED:
      component = <CompletedFlow></CompletedFlow>;
      break;
    case Status.FAILED:
      component = <FailedFlow></FailedFlow>;
      break;
    default:
      component = <></>;
  }






  return (
    <div className="App">

      {component}

    </div>
  );
}
function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);







}
export default App;

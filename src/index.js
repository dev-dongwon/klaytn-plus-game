import Cave from "caver-js";
import {
  Spinner
} from "spin.js";

const config = {
  rpcURL: "https://api.baobab.klaytn.net:8651"
}

const cav = new Cave(config.rpcURL);
// webpack 빌드할 때 파일을 읽고 전역 상수로 설정
// 이런것도 있구만.. 숙지하자
const agContract = new cav.klay.Contract(DEPLOYED_ABI, DEPLOYED_ADDRESS);

const App = {
  auth: {
    accessType: "keystore",
    keystore: '',
    password: ''
  },

  // session storage에 저장된 wallet 불러옴
  start: async function () {
    const walletFromSession = sessionStorage.getItem('walletInstance');
    // 값이 있으면
    if (walletFromSession) {
      try {
        cav.klay.accounts.wallet.add(JSON.parse(walletFromSession));
        this.changeUI(JSON.parse(walletFromSession));
      } catch (error) {
        sessionStorage.removeItem('walletInstance');
      }
    }
  },

  handleImport: async function () {
    const fileReader = new FileReader();
    fileReader.readAsText(event.target.files[0]);
    fileReader.onload = (event) => {
      try {
        if (!this.checkValidKeystore(event.target.result)) {
          $('#message').text('유효하지 않은 keystore 파일입니다');
          return;
        }
        this.auth.keystore = event.target.result;
        $('#message').text('keystore 통과. 비밀번호를 입력하세요');
        document.querySelector('#input-password').focus();
      } catch (error) {
        $('#message').text('유효하지 않은 keystore 파일입니다');
        return;
      }
    }
  },

  handlePassword: async function () {
    this.auth.password = event.target.value;
  },

  handleLogin: async function () {
    if (this.auth.accessType === 'keystore') {
      try {
        // keystore, password를 decrpyt해 privatekey 가져오기
        const privateKey = cav.klay.accounts.decrypt(this.auth.keystore, this.auth.password).privateKey;
        this.integrateWallet(privateKey);
      } catch (error) {
        $('#message').text('비밀번호가 일치히지 않습니다');
      }
    }
  },

  handleLogout: async function () {
    this.removeWallet();
    location.reload();
  },

  generateNumbers: async function () {
    const num1 = Math.floor((Math.random() * 50) + 10);
    const num2 = Math.floor((Math.random() * 50) + 10);
    sessionStorage.setItem('result', num1 + num2);

    $('#start').hide();
    $('#num1').text(num1);
    $('#num2').text(num2);
    $('#question').show();
    document.querySelector('#answer').focus();

    this.showTimer();
  },

  submitAnswer: async function () {

  },

  deposit: async function () {
    const spinner = this.showSpinner();
    const walletInstance = this.getWallet();
    // wallet이 존재하면
    if (walletInstance) {
      // 값이 다르면 바로 리턴
      if (await this.callOwner() !== walletInstance.address) return;

      const amount = $('#amount').val();

      if (amount) {
        // send 인자로 
        agContract.methods.deposit().send({
            // from : 계정 인증이 완료된 주소만 값으로 쓸 수 있음
            from: walletInstance.address,
            gas: '250000',
            value: cav.utils.toPeb(amount, "KLAY")
          })
          .once('transactionHash', (txHash) => {
            console.log(`txHash: ${txHash}`);
          })
          // 영수증을 받을 수 있으면 트랜잭션에 성공
          .once('receipt', (receipt) => {
            console.log(`${receipt.blockNumber}`);
            spinner.stop();
            alert(`${amount} KLAY를 컨트랙에 송금했습니다`)
            location.reload();
          })
          .once('error', (error) => {
            alert(error.message);
          })
      }
      return;
    }
  },

  callOwner: async function () {
    return await agContract.methods.owner().call();
  },

  callContractBalance: async function () {
    return await agContract.methods.getBalance().call();
  },

  getWallet: function () {
    if (cav.klay.accounts.wallet.length) {
      // 지금 내가 로그인 되어 있는 계정 월렛 가져오기
      return cav.klay.accounts.wallet[0];
    }
  },

  checkValidKeystore: function (keystore) {
    const parsedKeystore = JSON.parse(keystore);
    // keystore 필수 요소 구성 확인
    // 
    const isValidKeystore = parsedKeystore.version &&
      parsedKeystore.id &&
      parsedKeystore.address &&
      parsedKeystore.crypto

    return isValidKeystore;
  },

  // private key로 wallet instance를 가져옴
  integrateWallet: function (privateKey) {
    const walletInstance = cav.klay.accounts.privateKeyToAccount(privateKey);
    cav.klay.accounts.wallet.add(walletInstance);
    // session storage에 저장 => 계정 로그인 상태 유지
    sessionStorage.setItem('walletInstance', JSON.stringify(walletInstance));
    this.changeUI(walletInstance);
  },

  reset: function () {
    this.auth = {
      keystore: '',
      password: ''
    }
  },

  changeUI: async function (walletInstance) {
    // login 관련 UI interface 숨기기
    $('#loginModal').modal('hide');
    $('#login').hide();
    // login 후 보여야 할 ui interface
    $('#logout').show();
    $('#address').append(`<br><p>내 계정 주소: ${walletInstance.address}<p>`);
    $('#game').show();
    // 잔액 표시 dom 추가
    // cav.utils 부분은 peb을 klay 단위로 변환해줌
    $('#contractBalance')
      .append(`<p>이벤트 잔액: ${cav.utils.fromPeb(await this.callContractBalance(), "KLAY") + "KLAY"}<p>`);

    // owner div는 이벤트 주최자만 볼 수 있도록
    if (await this.callOwner() === walletInstance.address) {
      $("#owner").show();
    }
  },

  removeWallet: function () {
    // wallet clear : 계정 정보 지움
    cav.klay.accounts.wallet.clear();
    // 세션 정보 지움
    sessionStorage.removeItem('walletInstance');
    // reset 함수 호출 : global로 설정된 auth 초기화
    this.reset();
  },

  showTimer: function () {
    let seconds = 3;
    $('#timer').text(seconds);
    
    const interval = setInterval(() => {
      $("#timer").text(--seconds);
      // 3초가 지나면 초기화
      if (seconds <= 0) {
        $('#timer').text("");
        $("#answer").val("");
        $("#question").hide();
        $("#start").show();
        clearInterval(interval);
      }
    }, 1000);
  },

  showSpinner: function () {
    const target = document.getElementById('spin');
    return new Spinner(opts).spin(target);
  },

  receiveKlay: function () {

  }
};

window.App = App;

window.addEventListener("load", function () {
  App.start();
});

var opts = {
  lines: 10, // The number of lines to draw
  length: 30, // The length of each line
  width: 17, // The line thickness
  radius: 45, // The radius of the inner circle
  scale: 1, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  color: '#5bc0de', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: 'spinner-line-fade-quick', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  className: 'spinner', // The CSS class to assign to the spinner
  top: '50%', // Top position relative to parent
  left: '50%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  position: 'absolute' // Element positioning
};
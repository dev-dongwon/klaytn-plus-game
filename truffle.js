// truffle.js config for klaytn.
const PrivateKeyConnector = require('connect-privkey-to-provider');
const NETWORK_ID = '1001' // 바오밥 고유 네트워크 아이디
const GASLIMIT = '20000000';
const URL = 'https://api.baobab.klaytn.net:8651'
const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
  networks: {
    klaytn: {
      provider: new PrivateKeyConnector(PRIVATE_KEY, URL),
      network_id : NETWORK_ID,
      gas: GASLIMIT,
      gasPrice: null,
    }
  }
}
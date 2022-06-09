const express = require('express');
const app = express();
const port = 8080;

const Caver = require('caver-js');      // caver-js 설치 후 import
const { application } = require('express');
const caver = new Caver('https://api.baobab.klaytn.net:8651/')

require('dotenv').config(); // 환경 변수 .env파일 사용을 위한 dotenv import

app.use(express.json());
app.use(express.urlencoded({ extended: false })); // undefined 오류 방지 위한 urlencoded

app.listen(port, () => { console.log('서버 시작') }); // 터미널에 찍히는 멘트

app.get("/", async (req, res) => { res.send("서버 start") }); // 서버 페이지에 찍히는 멘트



// 1. 버젼 확인
app.get('/version', async (req, res)=> {
    const version = await caver.rpc.klay.getClientVersion();
    res.send(version);
}) 



// 2. 계정(주소, 비밀키) 생성
app.get('/createaccount', async(req, res)=> {
    const account = await caver.klay.accounts.create();
    const create = await caver.klay.accounts.wallet.add(account);
    
    const newAccount = {
        Address : create.address,
        Privatekey : create.privateKey
    }
    res.json(newAccount)
}) // create() 메서드로 계정 만들고 계정을 지갑에 넣어 사용가능한 지갑으로 만든다




// 3. 잔고 확인
app.get('/getbalance', async(req,res) => {
    const balance = await caver.klay.getBalance(req.body.address)
    const show = caver.utils.convertFromPeb(balance, 'KLAY')
    res.json(`현재 잔고 : ${show}`);
}) // 바디로 받은 주소값을 getBalance에 넣어주면 현재 잔고값을 가져온다.
   // 잔고값을 convertFromPeb 메서드로 지갑에 디스플레이한다




// 4. 토큰 전송
app.get('/transfer', async(req, res) => {

    let to = req.body.toAddress // 받을 사람 주소
    let amount = req.body.amount

    let balance = await caver.klay.getBalance(process.env.FROM_ADDRESS)
        balance = caver.utils.fromPeb(balance, 'KLAY')

    let check = await caver.klay.accountCreated(to); // 계정 존재 유무 체크
    console.log(check); 

    if(check && balance > amount) { // 계정 존재하고 토큰 부족 여부를 체크한 후 요청 갯수보다 예치된 금액이 더 크면 전송 
        const keyring = caver.wallet.keyring.createFromPrivateKey(process.env.PRIVATE_KEY);

        console.log(keyring)

        const valueTransfer = caver.transaction.valueTransfer.create({
            
            from : keyring.address,
            to : to,
            value : caver.utils.toPeb(`${amount}`, 'KLAY'),
            gas : 30000,
        });
        
        console.log(valueTransfer)

        const signed = await valueTransfer.sign(keyring)

        console.log(signed)

        const receipt = await caver.rpc.klay.sendRawTransaction(signed)

        console.log(receipt)
        res.send(receipt)
    }

    else { // 계정 없거나 잔액 부족시
        res.status(400).send('유효하지 않은 계정이거나 잔액 부족입니다')
    }   
}) 



// 5. smart contract 배포
app.post('/deploy', async(req, res) => {
    const account = caver.klay.accounts.wallet.add(process.env.PRIVATE_KEY)

    const ABI = req.body.abi
    const Bytecode = req.body.bytecode ;

    await caver.klay.sendTransaction({
        
        type : 'SMART_CONTRACT_DEPLOY',
        from : account.address,
        data : caver.klay.abi.encodeContractDeploy(ABI, Bytecode, 1, 2),
         gas : '900000',
       value : 0,

    }).on('transactionHash', function(hash){
        console.log('transaction Hash!', hash)
    
    }).on('receipt', function(receipt){
        console.log(receipt)
        res.json('contract deploy success!')

    }).on('error', console.error);

})





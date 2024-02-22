const send = async (template: string, to: string, token1, token2 = null, token3 = null) => {
  const Kavenegar = require('kavenegar');
  const apiKey = '41393854744470492B444C6E31723350692F577873503634546344323133566D6A476B2B4E72736F4B31773D';
  const api = Kavenegar.KavenegarApi({ apikey: apiKey });

  const body: any = {
    receptor: to,
    template: template,
    token: token1,
  }

  if (token2){
    body.token2 = token2
  }

  if (token3){
    body.token3 = token3
  }

  api.VerifyLookup(body);
};

const afterPaid = (name: string, phoneNumber: string, date: string, time: string) => {
  send('paid', phoneNumber, name, `${date} ساعت ${time}`);
};

const feedback = (name: string, phoneNumber: string) => {
  // send(text, phoneNumber);
};

const orderAssignUser = (name: string, worker: string, phoneNumber: string, date: string, time: string) => {
  send('assign', phoneNumber, name, worker, `${date} ساعت ${time}`);
};

const welcome = async (code: string, phoneNumber: string) => {
  await send('otp', phoneNumber, code);
};

const referral = (name: string, code: string, phoneNumber: string) => {
  send('referral', phoneNumber, code);
};

export default {
  referral,
  welcome,
  send,
  afterPaid,
  feedback,
  orderAssignUser
};
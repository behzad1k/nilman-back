import { removeSpace } from './funs';

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
  send('pay', phoneNumber, removeSpace(name), removeSpace(`${date} ساعت ${time}`));
};

const emergency = (orderCode: string, name: string, lastName: string) => {
  send('emergency', '09122966372', removeSpace(name), removeSpace(lastName), removeSpace(orderCode));
};

const feedback = (name: string, phoneNumber: string, code: string) => {
  send('feedback', phoneNumber, removeSpace(name), removeSpace(code));
};

const orderAssignUser = (name: string, worker: string, phoneNumber: string, date: string, time: string) => {
  send('assign', phoneNumber, removeSpace(name), removeSpace(worker), removeSpace(`${date} ساعت ${time}`));
};

const orderAssignWorker = (orderTitle: string, address: string, phoneNumber: string, date: string, time: string) => {
  send('assignWorker', phoneNumber, removeSpace(orderTitle), removeSpace(address), removeSpace(`${date} ساعت ${time}`));
};

const welcome = async (code: string, phoneNumber: string) => {
  await send('otp', phoneNumber, code);
};

const referral = (name: string, code: string, phoneNumber: string) => {
  send('referral', phoneNumber, code);
};

const notify = (price: string, code: string, order: string) => {
  send('notify', '09122251784', code, order, price);
};

export default {
  emergency,
  referral,
  welcome,
  send,
  afterPaid,
  feedback,
  orderAssignUser,
  orderAssignWorker,
  notify
};
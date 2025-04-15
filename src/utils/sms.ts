const send = (text: string, to: string) => {
  const Kavenegar = require('kavenegar');
  const apiKey = '41393854744470492B444C6E31723350692F577873503634546344323133566D6A476B2B4E72736F4B31773D'
  const api = Kavenegar.KavenegarApi({ apikey: apiKey });
  api.Send({ message: text , sender: "1000000300033" , receptor: to });
}

const afterPaid = (name: string, phoneNumber: string, date: string, time: string) => {
  const text = `${name} عزیز

کاربر گرامی نیلمان ؛

با سلام و تشکر از اینکه مجموعه ما را برای انجام خدمات خود انتخاب کردید. سفارش شما برای تاریخ ${date} ثبت شد.`
  send(text, phoneNumber)
}

const emergency = (orderCode: string, name: string, lastName: string) => {
  // send(text, phoneNumber)
}

const notify = (code: string, price: string, order: string, phoneNumber: string) => {
  const text = `سفارش به شماره ${code} برای خدمت ${order} به مبلغ ${price} ثبت شده است.`
  send(text, phoneNumber)
}

const feedback = (name: string, code: string, phoneNumber: string) => {
  const text = `سلام ${name} عزیز

ضمن تشكر از انتخاب نیلمان و آرزومندی جلب رضایت شما از سرویس انجام شده  ، ممنون میشویم تا میزان رضایتمندی و نظرات خود را در رابطه با سرویس انجام شده از طریق لینک زیر به ما انتقال دهید .

https://app.nilman.co/feedback/${code}

سپاس از مهر شما

'

نیلمان
`
  send(text, phoneNumber);
}

const orderAssignWorker = (name: string, code: string, address: string, phoneNumber: string, date: string, time: string) => {
   const text =  `سرکار خانم ${name}

سفارش ${code}   

به آدرس ${address}

در تاریخ ${date + ' ' + time}

به شما محول شده است.`
  send(text, phoneNumber);

}

const orderAssignWorkerChange = (name: string, code: string, phoneNumber: string) => {
  const text =  `سرکار خانم ${name}

سفارش ${code} 

لفو شد.`
  send(text, phoneNumber);

}

const orderAssignUser = (name: string, worker: string, phoneNumber: string, date: string, time: string) => {
   const text =  `${name} عزیز؛

خانم ${worker} در تاریخ ${date} ساعت ${time} به آدرس انتخابی شما مراجعه میکند. `
  send(text, phoneNumber);

}

const welcome = (code: string, phoneNumber: string) => {
  const text = `کاربر گرامی

به نیلمان خوش آمدید.

کد ورود شما: ${code}



@app.nilman.co ${code}`
  send(text, phoneNumber);
}

const referral = (name: string, code: string, phoneNumber: string) => {
  const text = `کاربر گرامی 

به نیلمان خوش آمدید.

کد معرف شما:

code: ${code}

با ثبت کد توسط دوستان شما

10درصدتخفیف درسفارش بعدی

شما اعمال میگردد.`
  send(text, phoneNumber);
}

const sendPortal = (name: string, price: string, link: string, phoneNumber: string) => {
  const text = `${name}   عزیز; 
  لطفا از طریق لینک درگاه زیر نسبت به پرداخت سفارش خود به مبلغ ${price} اقدام نمایید.
  باتشکر; نیلمان
  ${link}`
  send(text, phoneNumber);
}

export default {
  emergency,
  referral,
  welcome,
  send,
  afterPaid,
  feedback,
  orderAssignUser,
  orderAssignWorker,
  notify,
  orderAssignWorkerChange,
  sendPortal
}
const send = (text: string, to: string) => {
  const Kavenegar = require('kavenegar');
  const apiKey = '41393854744470492B444C6E31723350692F577873503634546344323133566D6A476B2B4E72736F4B31773D'
  const api = Kavenegar.KavenegarApi({ apikey: apiKey });
  api.Send({ message: text , sender: "1000000300033" , receptor: to });
}

const afterPaid = (name: string, phoneNumber: string, date: string, time: string) => {
  const text = `${name} عزیز
    کاربر گرامی نیلمان ؛
    با سلام و تشکر از اینکه مجموعه ما را برای انجام خدمات خود انتخاب کردید. سفارش شما برای تاریخ ${date} ساعت ${time} ثبت شد.`
  send(text, phoneNumber)
}

const feedback = (name: string, phoneNumber: string, url: string) => {
  const text = `سلام ${name} عزیز
ضمن تشكر از انتخاب نیلمان و آرزومندی جلب رضایت شما از سرویس انجام شده  ، ممنون میشویم تا میزان رضایتمندی و نظرات خود را در رابطه با سرویس انجام شده از طریق لینک زیر به ما انتقال دهید .
${url}
سپاس از مهر شما
'
نیلمان`
  send(text, phoneNumber);
}

const orderAssignUser = (name: string, worker: string, phoneNumber: string, date: string, time: string) => {
   const text =  `${name} عزیز؛
  خانم ${worker} در تاریخ ${date} ساعت ${time} به آدرس انتخابی شما مراجعه میکند.`
  send(text, phoneNumber);

}

const welcome = (code: string, phoneNumber: string) => {
  const text = `کاربر گرامی \nبه نیلمان خوش آمدید.\nکد ورود شما: \ncode: ${code}`
  send(text, phoneNumber);
}

const referral = (name: string, code: string, phoneNumber: string) => {
  const text = `کاربر گرامی \nبه نیلمان خوش آمدید.\nکد معرف شما: \ncode: ${code}`
  send(text, phoneNumber);
}

export default {
  referral,
  welcome,
  send,
  afterPaid,
  feedback,
  orderAssignUser
}
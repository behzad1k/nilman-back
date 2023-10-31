const send = (text: string, to: string) => {

  const Kavenegar = require('kavenegar');
  const api = Kavenegar.KavenegarApi({apikey: '352B4A496B4A58557A7A77536A75346D6875736D5A576246714E4B2B764F4A6576726B626E6331726D2F673D'});
  api.Send({ message: text , sender: "10008663" , receptor: to });

}

const afterPaid = (name: string, phoneNumber: string, date: string, time: string) => {
  const text = `${name} عزیز
    کاربر گرامی نیلمان ؛
    با سلام و تشکر از اینکه مجموعه ما را برای انجام خدمات خود انتخاب کردید. سفارش شما برای تاریخ ${date} ساعت ${time} ثبت شد.`
  send(text, phoneNumber)
}

const feedback = (name: string, phoneNumber: string) => {
  const text = `سلام ${name} عزیز
ضمن تشكر از انتخاب نیلمان و آرزومندی جلب رضایت شما از سرویس انجام شده  ، ممنون میشویم تا میزان رضایتمندی و نظرات خود را در رابطه با سرویس انجام شده به ما انتقال دهید .

سپاس از مهر شما

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
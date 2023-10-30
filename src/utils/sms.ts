const send = (text: string, to: string) => {

  const Kavenegar = require('kavenegar');
  const api = Kavenegar.KavenegarApi({apikey: '41393854744470492B444C6E31723350692F577873503634546344323133566D6A476B2B4E72736F4B31773D'});
  api.Send({ message: text , sender: "10008663" , receptor: to });

}

const afterPaid = (name: string, phoneNumber: string, date: string, time: string) => {
  const text = `${name} عزیز
    کاربر گرامی نیلمان ؛
    با سلام و تشکر از اینکه مجموعه ما را برای انجام خدمات خود انتخاب کردید. سفارش شما برای تاریخ ${date} ساعت ${time} ثبت شد.`
  send(text, phoneNumber)
}
export default {
  send
}
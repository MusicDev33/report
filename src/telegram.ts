const TELEGRAM_KEY = process.env.TELEGRAM_API_KEY;

export const sendMsgToUser = async (userId: string, msg: string) => {
  const data = await fetch(`https://api.telegram.org/${TELEGRAM_KEY}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: userId,
      text: msg,
      parse_mode: 'MarkdownV2'
    })
  });

  console.log(data);
}
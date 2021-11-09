$(document).ready(function () {
    $("#sidebar").mCustomScrollbar({
        theme: "minimal"
    });

    $('#sidebarCollapse').on('click', function () {
        $('#sidebar, #content').toggleClass('active');
        $('.collapse.in').toggleClass('in');
        $('a[aria-expanded=true]').attr('aria-expanded', 'false');
        $('#sidebarCollapseText')[0].innerText = $('#sidebarCollapseText')[0].innerText == '收起' ? '展开' : '收起';
    });
});

const pathName = document.location.pathname;
const rootPath = pathName.substr(1, pathName.search(/index.html/g) - 1);
var draftPath = rootPath + 'drafts/';
var outPath = rootPath + 'out/';
const smtpPort = 25;
const smtpPortSafe = 465;
const pop3Port = 110;
const pop3PortSafe = 995;

var fs = require('fs')
var net = require('net');
var tls = require('tls');

let edit_state = "new";
let edit_from = "";
let receiveNum = 0;

var pageType = "write";

var info = {
    smtpHost: '',
    pop3Host: '',
    username: '',
    password: ''
};

window.onresize = function () {
    fit();
}

function choosePath(type){
    if(type == "draft")
        path = draftPath;
    else if(type == "out")
        path = outPath;
    return path;
}

function fit() {
    $('#maintext')[0].rows = Math.round((window.innerHeight - $('#maintext')[0].getBoundingClientRect().top) / 25) - 5
}

function checkEmpty() {
    return $('#receiver')[0].value == '' || $('#subject')[0] == '' || $('#maintext')[0] == '';
}

function clear() {
    $('#appendix')[0].value = $('#receiver')[0].value = $('#subject')[0].value = $('#maintext')[0].value = ''
    $('#receiver')[0].classList.remove('active');
    $('#subject')[0].classList.remove('active');
    $('#maintext')[0].classList.remove('active');
}

function saveDraft() {
    date = new Date();
    date = date.toLocaleDateString().replaceAll('/', '-') + '+' + date.toLocaleTimeString('chinese', { hour12: false }).replaceAll(':', '-');
    let content = {
        'receiver': $('#receiver')[0].value,
        'subject': $('#subject')[0].value,
        'maintext': $('#maintext')[0].value
    };
    filename = draftPath + date + '.json'
    fs.writeFile(filename, JSON.stringify(content), (error) => {
        if (error) {
            Swal.fire({
                title: '保存失败',
                type: 'error',
                text: '文件错误',
                confirmButtonText: "确定",
                showCancelButton: false,
            })
        }
        else {
            if(edit_state == "draft"){
                fs.unlinkSync(draftPath + edit_from);
                edit_from = filename.replace(draftPath, "");
            }
            else{
                updateNumberText("draft", 1);
            }
            Swal.fire({
                title: '保存成功',
                type: 'success',
                text: '草稿已保存到草稿箱',
                confirmButtonText: "确定",
                showCancelButton: false,
            });
        }
    });
}

function saveOut() {
    date = new Date();
    date = date.toLocaleDateString().replaceAll('/', '-') + '+' + date.toLocaleTimeString('chinese', { hour12: false }).replaceAll(':', '-');
    let content = {
        'receiver': $('#receiver')[0].value,
        'subject': $('#subject')[0].value,
        'maintext': $('#maintext')[0].value
    };
    filename = outPath + date + '.json';
    fs.writeFileSync(filename, JSON.stringify(content));
}

$("#sendButton").on('click', function () {
    if (checkEmpty()) {
        Swal.fire({
            title: '发送失败',
            type: 'error',
            text: '请将相关信息填写完整',
            confirmButtonText: "确定",
            showCancelButton: false,
        }).then(function (result) {

        });
    }
    else {
        send(false);
    }
});

$("#safeSendButton").on('click', function () {
    if (checkEmpty()) {
        Swal.fire({
            title: '发送失败',
            type: 'error',
            text: '请将相关信息填写完整',
            confirmButtonText: "确定",
            showCancelButton: false,
        }).then(function (result) {

        });
    }
    else {
        send(true);
    }
});

$('#clearButton').on('click', function () {
    Swal.fire({
        title: '确定要清除吗',
        type: 'info',
        showCancelButton: true,
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        focusConfirm: true, //聚焦到确定按钮
    }).then(function (result) {
        if (result['value']) {
            clear();
        }
    })
})

$('#saveButton').on('click', function () {
    if ($('#receiver')[0].value == '') {
        Swal.fire({
            title: '保存失败',
            type: 'error',
            text: '收件人不能为空',
            confirmButtonText: "确定",
            showCancelButton: false,
        })
    }
    else {
        saveDraft();
    }
})

$('#chooseButton').on('click', function() {
    $('.' + pageType + 'Table').each(function(){
        $(this)[0].classList.add("chosen");
        $(this)[0].bgColor = "#dde8fd";
    })
})

$('#unchooseButton').on('click', function() {
    $('.' + pageType + 'Table').each(function(){
        $(this)[0].classList.remove("chosen");
        $(this)[0].bgColor = "#eaf1ff";
    })
})

$('#deleteButton').on('click', function() {
    let flag = 0;
    if(pageType == "draft" || pageType == "out") {
        path = choosePath(pageType);
        $("." + pageType + "Table.chosen").each(function(){
            filename = path + $(this)[0].filename;
            fs.unlinkSync(filename);
            $(this).remove();
            flag = 1;
        });
    }
    else if(type == "receive"){
        let i = 0;
        var socket = net.connect(pop3Port, info.pop3Host, function () {
            console.log('CONNECTED TO: ' + info.pop3Host + ':' + pop3Port);
        });
        var commands = [
            'USER ' + info.username + '\r\n',
            'PASS ' + info.password + '\r\n',
        ];
        $("." + pageType + "Table.chosen").each(function(){
            commands.push("DELE " + $(this)[0].filename + '\r\n');
            $(this).remove();
        });
        commands.push('QUIT\r\n');
        socket.on('data', buff => {
            if (i < commands.length) {
                socket.write(String(commands[i++]));
            } else {
                socket.destroy();
            }
        })
        flag = 1;
        receiveNum -= (commands.length - 3);
        updateNumberText("receive", -(commands.length - 3));
    }
    if(flag) {
        updateNumber(pageType, $("." + pageType + "Table").length);
        if(pageType == "draft")
            text = '选中草稿已删除';
        else if(pageType == "out")
            text = '选中邮件已删除';
        else if(pageType == "receive")
            text = '选中右键已通知服务器删除'
        Swal.fire({
            title: '成功',
            type: 'success',
            text: text,
            focusConfirm: true, //聚焦到确定按钮
            confirmButtonText: "确定"
        });
    }
})

$('#updateButton').on('click', function() {
    if(pageType == "draft" || pageType == "out") {
        load(pageType, true);
        Swal.fire({
            title: '更新成功',
            type: 'success',
            confirmButtonText: "确定",
            showCancelButton: false,
        });
    }
    else if(pageType == "receive") {
        loginPop3Test();
        setTimeout(()=>{
            load(pageType, true);
        },1000);
    }
})

$("#returnButton").on('click', function() {
    $("#preview")[0].style.display = "none";
    $("." + pageType + "Table").each(function() {
        $(this)[0].style.display = "block";
    })
    $(".specialButton")[0].style.display = "none";
})

function typeSwitch(type, lastType){
    if($("#preview")[0])
        $("#preview")[0].style.display = "none";
    $("#" + lastType + "Li")[0].className = "sideLi";
    $("#" + type + "Li")[0].className = "active sideLi";
    $("." + lastType + "Button")[0].style.display = "none";
    $("." + type + "Button")[0].style.display = "block";
    $("#" + lastType + "Page")[0].style.display = "none";
    $("#" + type + "Page")[0].style.display = "block";
    $(".specialButton")[0].style.display = "none";
    if(type == "write")
        fit();
    else if(type == "draft") {
        load("draft", false);
    }
    else if(type == "out") {
        load("out", false);
    }
    else if(type == "receive") {
        load("receive", false);
    }
    pageType = type;
}

$('.sideLi').on('click', function(e){
    let lastLi = $('li.active.sideLi')[0];
    let li = $(this)[0];
    type = li.id.substr(0, li.id.length - 2);
    lastType = lastLi.id.substr(0, lastLi.id.length - 2);
    if(type != lastType){
        typeSwitch(type, lastType);
    }
});

function genMimeData() {
    boundary = "cute_boundary";

    DATA = "";
    DATA += "Mime-Version: 1.0\r\n";
    DATA += "Content-Type: multipart/mixed;boundary=\"" + boundary + "\"\r\n\r\n";
    DATA += "Content-Transfer-Encoding:7bit\r\n\r\n";

    // 邮件正文
    DATA += "--" + boundary + "\r\n";
    DATA += "Content-Type: text/plain;charset=utf-8\r\n";
    DATA += "Content-Transfer-Encoding:7bit\r\n\r\n"
    DATA += $("#maintext")[0].value + "\r\n";

    // 附件内容
    files = $('#appendix').prop('files');
    files.forEach(function(file) {
        DATA += "--" + boundary + "\r\n";
        DATA += "Content-Transfer-Encoding: utf-8\r\n";
        DATA += "Content-Type:application/octet-stream;\r\n";
        DATA += "Content-Disposition: attachment; filename=\"" + file.name + "\"\r\n\r\n";
        DATA += fs.readFileSync(file.path) + "\r\n";
    });

    // 邮件结束
    DATA += "--" + boundary + "--\r\n";
    DATA += "\r\n.\r\n";
    return DATA;
}

function send(useTLS) {
    let i = 0;
    if(useTLS) {
        var socket = tls.connect(smtpPortSafe, info.smtpHost, function () {
            console.log('CONNECTED TO: ' + info.smtpHost + ':' + smtpPortSafe);
        });
    }
    else {
        var socket = net.connect(smtpPort, info.smtpHost, function () {
            console.log('CONNECTED TO: ' + info.smtpHost + ':' + smtpPort);
        });
    }

    var commands = [
        'HELO ' + info.smtpHost + '\r\n',
        'AUTH LOGIN\r\n',
        window.btoa(info.username) + '\r\n',
        window.btoa(info.password) + '\r\n',
        'MAIL FROM: <' + info.username + '>\r\n'
    ]
    cnt = 0;
    DATA = "FROM: <" + info.username + '>\r\n';
    DATA += "TO: ";
    $("#receiver")[0].value.split(';').forEach(function(receiver){
        if(receiver){
            commands.push('RCPT TO: <' + receiver + '>\r\n');
            DATA += "<" + receiver + ">;"
            cnt ++;
        }
    })
    DATA += "\r\n";
    DATA += "SUBJECT: " + $("#subject")[0].value + "\r\n";
    DATA += genMimeData();

    commands.push('DATA\r\n');
    commands.push(DATA)
    commands.push('QUIT\r\n');

    socket.on('error', buff => {
        errorPannel("发送失败");
    })

    socket.on('data', buff => {
        const res = buff.toString();
        if (i >= 6 && i <= 5 + cnt) {
            if (res.substr(0, 3) != '250'){
                i = commands.length;
                errorPannel("发送失败");
            }
        }
        if (i == 7 + cnt) {
            if (res.substr(0, 3) != '250'){
                i = commands.length;
                errorPannel("发送失败");
            }
            else {
                Swal.fire({
                    title: '发送成功',
                    type: 'success',
                    text: '您的信件已经在路上了~',
                    confirmButtonText: "确定",
                    showCancelButton: false,
                }).then(function (result) {
                    saveOut();
                    updateNumberText("out", 1);
                    clear();
                });
            }
        }
        if (i < commands.length) {
            socket.write(String(commands[i++]));
        } else {
            socket.destroy();
        }
    });
}

function infoPannel() {
    var html = "<div style='height:60px'><p style='display:inline-block;width:150px;text-align:justify;'>SMTP服务器：</p><input placeholder='SMTP' id='smtpHost_input' value=" + info.smtpHost + "></input></div>\
    <div style='height:60px'><p style='display:inline-block;width:150px;text-align:justify;'>POP3服务器：</p><input placeholder='SMTP' id='pop3Host_input' value=" + info.pop3Host + "></input></div>\
    <div style='height:60px'><p style='display:inline-block;width:150px;text-align:justify;'>&nbsp;&nbsp;&nbsp;&nbsp;用户名：</p><input placeholder='用户名' id='username_input' value=" + info.username + "></input></div>\
    <div style='height:60px'><p style='display:inline-block;width:150px;text-align:justify;'>&nbsp;&nbsp;&nbsp;&nbsp;授权码：</p><input placeholder='授权码' id='password_input'value=" + info.password + "></input></div>";
    Swal.fire({
        title: '登录信息',
        type: 'info',
        html: html, // HTML
        focusConfirm: true, //聚焦到确定按钮
        confirmButtonText: "确定",
    }).then(function (result) {
        if (result['value']) {
            info.smtpHost = $("#smtpHost_input")[0].value;
            info.pop3Host = $("#pop3Host_input")[0].value;
            info.username = $("#username_input")[0].value;
            info.password = $("#password_input")[0].value;
            if (info.smtpHost && info.pop3Host && info.username && info.password) {
                loginSmtpTest();
                loginPop3Test();
            }
            else
                errorPannel("登录失败");
        }
    });
}

function successPannel(title = "登陆成功", text = "登录信息已保存到客户端") {
    Swal.fire({
        title: title,
        type: 'success',
        text: text,
        focusConfirm: true, //聚焦到确定按钮
        confirmButtonText: "确定"
    }).then(function (result) {
        saveInfo();
        draftPath = rootPath + 'drafts/' + info.username + "/";
        outPath = rootPath + 'out/' + info.username + "/";
        if(!fs.existsSync(draftPath)){
            fs.mkdirSync(draftPath);
        }
        if(!fs.existsSync(outPath)){
            fs.mkdirSync(outPath);
        }
        load("draft", true);
        load("out", true);
    });
}

function errorPannel(title) {
    Swal.fire({
        title: title,
        type: 'error',
        text: '请检查信息是否完整且正确',
        focusConfirm: true, //聚焦到确定按钮
        confirmButtonText: "确定"
    }).then(function (result) {
        if(type.includes("登录"))
            infoPannel();
    });
}

function loginSmtpTest() {
    let i = 0;
    var socket = net.connect(smtpPort, info.smtpHost, function () {
        console.log('CONNECTED TO: ' + info.smtpHost + ':' + smtpPort);
    });

    var commands = [
        'HELO ' + info.smtpHost + '\r\n',
        'AUTH LOGIN\r\n',
        window.btoa(info.username) + '\r\n',
        window.btoa(info.password) + '\r\n'
    ]

    socket.on('error', buff => {
        errorPannel("登录SMTP服务器失败");
    })

    socket.on('data', buff => {
        const res = buff.toString();
        if (i == 4) {
            if (res.substr(0, 3) == '235')
                successPannel("登录SMTP服务器已成功");
            else
                errorPannel("登录SMTP服务器失败");
        }
        if (i < commands.length) {
            socket.write(String(commands[i++]));
        } else {
            socket.destroy();
        }
    });
}

function loginPop3Test() {
    let i = 0;
    var socket = net.connect(pop3Port, info.pop3Host, function () {
        console.log('CONNECTED TO: ' + info.pop3Host + ':' + pop3Port);
    });

    var commands = [
        'USER ' + info.username + '\r\n',
        'PASS ' + info.password + '\r\n',
        'STAT\r\n'
    ]

    socket.on('error', buff => {
        errorPannel("登录POP3服务器失败");
    })

    socket.on('data', buff => {
        const res = buff.toString();
        if (i == 2) {
            if (res.substr(1, 2) == 'OK')
                successPannel("登录POP3服务器成功", "信息已更新");
            else
                errorPannel("登录POP3服务器失败");
        }
        if (i == 3) {
            numberStr = res.split(' ')[1];
            receiveNum = Number(numberStr);
            updateNumber("receive", numberStr);
        }
        if (i < commands.length) {
            socket.write(String(commands[i++]));
        } else {
            socket.destroy();
        }
    });
}

function readInfo() {
    info = JSON.parse(fs.readFileSync(rootPath + 'info.json'));
}

function saveInfo() {
    fs.writeFile(rootPath + 'info.json', JSON.stringify(info), (error) => { if (error) alert('Error!'); });
}

function init() {
    fit();
    readInfo();
    if(!fs.existsSync(draftPath)){
        fs.mkdirSync(draftPath);
    }
    if(!fs.existsSync(outPath)){
        fs.mkdirSync(outPath);
    }
    updateNumber("draft", 0);
    updateNumber("out", 0);
    updateNumber("receive", 0);
    infoPannel();
}

function insertTable(type, filename, subject, receiver, maintext) {
    var table = document.createElement('table');
    table.width = '100%';
    table.filename = filename;
    table.className = type + "Table ripple";
    table.style.cursor = "pointer";
    table.bgColor='#eaf1ff';
    if(type == "receive") {
        yearMonth = subject = receiver = maintext = "";
        day = filename;
    }
    else{
        let date = filename.split('.json')[0].split('+')[0];
        let parts = date.split('-');
        yearMonth = parts[0] + "-" + parts[1];
        day = parts[2];
        receiver = "to: " + receiver;
    }
    table.innerHTML = "<td style='padding-left:30px; padding-bottom:10px;'>\
        <table>\
            <th width='60' style='font-weight:normal; vertical-align:top;'>\
                <table>\
                    <tr>\
                        <td style='color:#000000; Arial,sans-serif; font-size:12px; line-height:16px; padding-bottom:6px;'>\
                            <div>" + yearMonth + "</div>\
                        </td>\
                    </tr>\
                    <tr>\
                        <td style='color:#1e52bd; Arial,sans-serif; font-size:40px; line-height:44px; font-weight:bold;'>\
                            <div>" + day + "</div>\
                        </td>\
                    </tr>\
                </table>\
            </th>\
            <th width='30' style='font-weight:normal; direction:ltr;'></th>\
            <th style='font-weight:normal; vertical-align:top;'>\
                <table>\
                    <tr>\
                        <td\
                            style='font-size:14px; line-height:18px; padding-bottom:5px; color:#000000;'>\
                            <div style='font-weight:bold;'>" + subject + "</div>\
                            <div style='font-weight:regular;'>" + receiver + "</div>\
                        </td>\
                    </tr>\
                    <tr>\
                        <td\
                            style='font-size:14px; line-height:22px; color:#000000;'>\
                            <div>" + maintext +"</div>\
                        </td>\
                    </tr>\
                </table>\
            </th>\
        </table>\
    </td>"
    $("#" + type + "Page")[0].appendChild(table);
}

function insertPreview(type, content) {
    var div =document.createElement('div');
    div.id = "preview";
    div.style.display = "none";
    div.style.top = "-10px";
    if(type == "receive") {
        div.innerText = content;
    }
    else if(type == "out") {
        content.receiver += content.receiver.substr(-1,1)==";" ? "" : ";"
        div.innerHTML = "<h3>" + content.subject + "</h3><div>收件人:" + content.receiver + "</div><div>正文:\n" + content.maintext + "</div>";
    }
    $("#" + pageType + "Page")[0].appendChild(div);
}

function bindClickForTables(type) {
    $('.' + type + 'Table').on('click', function(e){
        if($(this)[0].classList.contains("chosen")){
            $(this)[0].classList.remove("chosen");
            $(this)[0].bgColor = "#eaf1ff";
        }
        else{
            $(this)[0].classList.add("chosen");
            $(this)[0].bgColor = "#dde8fd";
        }
    });
}

function bindDblClikForTables(type){
    if(type == "draft"){
        $('.' + type + 'Table').on('dblclick', function(e){
            filename = $(this)[0].filename;
            edit_state = type;
            edit_from = filename;
            path = choosePath(type);
            content = JSON.parse(fs.readFileSync(path + filename));
            if(content.receiver){
                $('#receiver')[0].value = content.receiver;
                $('#receiver')[0].classList.add("active");
            }
            if(content.subject){
                $('#subject')[0].value = content.subject;
                $('#subject')[0].classList.add("active");
            }
            if(content.subject){
                $('#maintext')[0].value = content.maintext;
                $('#maintext')[0].classList.add("active");
            }
            typeSwitch("write", type);
        });
    }
    else if(type == "receive" || "out"){ //预览邮件
        $('.' + type + 'Table').on('dblclick', function(e){
            filename = $(this)[0].filename;
            if(type == "receive") {
                let i = 0;
                var socket = net.connect(pop3Port, info.pop3Host, function () {
                    console.log('CONNECTED TO: ' + info.pop3Host + ':' + pop3Port);
                });

                var commands = [
                    'USER ' + info.username + '\r\n',
                    'PASS ' + info.password + '\r\n',
                    'RETR ' + filename + '\r\n'
                ]

                content = "";
                
                socket.on('error', buff => {
                    errorPannel("登录POP3服务器失败");
                })

                socket.on('data', buff => {
                    const res = buff.toString();
                    if (i == 2 && res.substr(1, 2) != 'OK') {
                        errorPannel("登录POP3服务器失败");
                    }
                    if (i < commands.length) {
                        socket.write(String(commands[i++]));
                    } else if (i > commands.length){
                        content += res;
                        $("#preview").remove();
                        insertPreview(type, content);
                        $("." + pageType + "Table").each(function() {
                            $(this)[0].style.display = "none";
                        })
                        $(".specialButton")[0].style.display = "inline";
                        $("#preview")[0].style.display = "block";
                        if(res.substr(-1, 1) == ".") {
                            socket.destroy();
                        }
                    } else{
                        i++;
                    }
                });
            }
            else{
                content = JSON.parse(fs.readFileSync(path + filename));
                $("#preview").remove();
                insertPreview(type, content);
                $("." + pageType + "Table").each(function() {
                    $(this)[0].style.display = "none";
                })
                $(".specialButton")[0].style.display = "inline";
                $("#preview")[0].style.display = "block";
            }
        });
    }
}

function updateNumber(type, number) {
    numberStr = String(number);
    numberStr = "&ensp;".repeat(15 - numberStr.length) + "(" + numberStr + ")";
    $("#" + type + "LiText")[0].innerHTML = $("#" + type + "LiText")[0].innerHTML.replace(/(\u2002)*?\([0-9]+?\)/g, numberStr);
};

function updateNumberText(type, off) {
    numberStr = $("#" + type + "LiText")[0].innerHTML.match(/\([0-9]+?\)/g)[0];
    numberStr = numberStr.substr(1, numberStr.length - 2);
    numberStr = String(Number(numberStr) + off);
    numberStr = "&ensp;".repeat(15 - numberStr.length) + "(" + numberStr + ")";
    $("#" + type + "LiText")[0].innerHTML = $("#" + type + "LiText")[0].innerHTML.replace(/(\u2002)*?\([0-9]+?\)/g, numberStr);
};

function load(type, update) {
    $("." + type + "Table").each(function() {
        $(this).remove();
    });
    if(type == "receive") {
        files = new Array(receiveNum);
        for(var i = 0; i < files.length; i++){
            files[i] = String(i + 1);
        }
    }
    else{
        path = choosePath(type);
        files = fs.readdirSync(path);
    }
    files.reverse();
    if(files.length)
        $("#" + type + "EmptyTip")[0].style.display = "none";
    else
        $("#" + type + "EmptyTip")[0].style.display = "block";
    files.forEach(function(filename) {
        if(type == "draft" || type == "out") {
            content = JSON.parse(fs.readFileSync(path + filename));
            receiver = content.receiver.split(';')
            receiver = receiver.length > 2 ? receiver[0] + ";..." : receiver;
            subject = content.subject;
            subject = subject.length > 30 ? subject.substr(0, 30) + "..." : subject;
            maintext = content.maintext;
            line1 = maintext.indexOf('\n') >= 0 ? maintext.substr(0, maintext.indexOf('\n')) : maintext;
            maintext = line1.substr(0, 30) + "...";
        }
        insertTable(type, filename, subject, receiver, maintext);
    });
    bindClickForTables(type);
    bindDblClikForTables(type);
    if(update)
        updateNumber(type, $("." + type + "Table").length);
}
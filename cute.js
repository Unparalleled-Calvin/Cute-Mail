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
const draftPath = rootPath + 'drafts/';
const outPath = rootPath + 'out/';

var fs = require('fs')
var net = require('net');
const { userInfo } = require('os');

let edit_state = "new";
let edit_from = "";

var info = {
    host: '',
    username: '',
    password: '',
    port: 25
};

function fit() {
    $('#maintext')[0].rows = Math.round((window.innerHeight - $('#maintext')[0].getBoundingClientRect().top) / 25) - 3
}
window.onresize = function () {
    fit();
}

function checkEmpty() {
    return $('#receiver')[0].value == '' || $('#subject')[0] == '' || $('#maintext')[0] == '';
}

function clear() {
    $('#receiver')[0].value = $('#subject')[0].value = $('#maintext')[0].value = ''
    $('#receiver')[0].classList.remove('active');
    $('#subject')[0].classList.remove('active');
    $('#maintext')[0].classList.remove('active');
}

function saveDraft() {
    date = new Date()
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
                edit_from = filename;
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
        send();
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
    $('.draftTable').each(function(){
        $(this)[0].classList.add("chosen");
        $(this)[0].firstChild.firstChild.firstChild.bgColor = "#dde8fd";
    })
})

$('#unchooseButton').on('click', function() {
    $('.draftTable').each(function(){
        $(this)[0].classList.remove("chosen");
        $(this)[0].firstChild.firstChild.firstChild.bgColor = "#eaf1ff";
    })
})

$('#deleteButton').on('click', function() {
    let flag = 0;
    $(".draftTable.chosen").each(function(){
        filename = draftPath + $(this)[0].filename;
        fs.unlinkSync(filename);
        $(this).remove();
        flag = 1
    })
    if(flag) {
        Swal.fire({
            title: '成功',
            type: 'success',
            text: '选中草稿已删除',
            focusConfirm: true, //聚焦到确定按钮
            confirmButtonText: "确定"
        });
    }
})

function typeSwitch(type, lastType){
    $("#" + lastType + "Li")[0].className = "sideLi";
    $("#" + type + "Li")[0].className = "active sideLi";
    $("." + lastType + "Button")[0].style.display = "none";
    $("." + type + "Button")[0].style.display = "block";
    $("#" + lastType + "Page")[0].style.display = "none";
    $("#" + type + "Page")[0].style.display = "block";
    if(type == "write")
        fit();
    else if(type=="draft")
        loadDrafts();
}

$('.sideLi').on('click', function(e){
    let lastLi = $('li.active.sideLi')[0];
    let li = e.target.parentNode;
    type = li.id.substr(0, li.id.length - 2)
    lastType = lastLi.id.substr(0, lastLi.id.length - 2)
    if(type != lastType){
        typeSwitch(type, lastType);
    }
})

function send() {
    let i = 0;
    var socket = net.connect(info.port, info.host, function () {
        console.log('CONNECTED TO: ' + info.host + ':' + info.port);
    });

    var commands = [
        'HELO ' + info.host + '\r\n',
        'AUTH LOGIN\r\n',
        window.btoa(info.username) + '\r\n',
        window.btoa(info.password) + '\r\n',
        'MAIL FROM: <' + info.username + '>\r\n'
    ]
    cnt = 0;
    DATA = "FROM: <" + userInfo.username + '>\r\n';
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
    DATA += $("#maintext")[0].value + "\r\n.\r\n";

    commands.push('DATA\r\n');
    commands.push(DATA)
    commands.push('QUIT\r\n');

    socket.on('error', buff => {
        errorPannel();
    })

    socket.on('data', buff => {
        const res = buff.toString();
        if (i >= 6 && i <= 5 + cnt) {
            if (res.substr(0, 3) != '250'){
                i = commands.length;
                errorPannel();
            }
        }
        if (i == 7 + cnt) {
            if (res.substr(0, 3) != '250'){
                i = commands.length;
                errorPannel();
            }
            else {
                Swal.fire({
                    title: '发送成功',
                    type: 'success',
                    text: '您的信件已经在路上了~',
                    confirmButtonText: "确定",
                    showCancelButton: false,
                }).then(function (result) {
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
    var html = "<div style='height:60px'><p style='display:inline-block;width:100px;text-align:justify;'>服务器：</p><input placeholder='服务器' id='host_input' value=" + info.host + "></input></div>\
    <div style='height:60px'><p style='display:inline-block;width:100px;text-align:justify;'>用户名：</p><input placeholder='用户名' id='username_input' value=" + info.username + "></input></div>\
    <div style='height:60px'><p style='display:inline-block;width:100px;text-align:justify;'>授权码：</p><input placeholder='授权码' id='password_input'value=" + info.password + "></input></div>";
    Swal.fire({
        title: '登录信息',
        type: 'info',
        html: html, // HTML
        focusConfirm: true, //聚焦到确定按钮
        confirmButtonText: "确定",
    }).then(function (result) {
        if (result['value']) {
            info.host = $("#host_input")[0].value;
            info.username = $("#username_input")[0].value;
            info.password = $("#password_input")[0].value;
            if (info.host && info.username && info.password) {
                loginTest();
            }
            else
                errorPannel();
        }
    });
}

function successPannel() {
    Swal.fire({
        title: '登录成功',
        type: 'success',
        text: '登录信息已保存到客户端',
        focusConfirm: true, //聚焦到确定按钮
        confirmButtonText: "确定"
    }).then(function (result) {
        saveInfo();
    });
}

function errorPannel() {
    Swal.fire({
        title: '登陆失败',
        type: 'error',
        text: '请检查信息是否完整且正确',
        focusConfirm: true, //聚焦到确定按钮
        confirmButtonText: "确定"
    }).then(function (result) {
        infoPannel();
    });
}

function loginTest() {
    let i = 0;
    var socket = net.connect(info.port, info.host, function () {
        console.log('CONNECTED TO: ' + info.host + ':' + info.port);
    });

    var commands = [
        'HELO ' + info.host + '\r\n',
        'AUTH LOGIN\r\n',
        window.btoa(info.username) + '\r\n',
        window.btoa(info.password) + '\r\n'
    ]

    socket.on('error', buff => {
        errorPannel();
    })

    socket.on('data', buff => {
        const res = buff.toString();
        if (i == 4) {
            if (res.substr(0, 3) == '235')
                successPannel();
            else
                errorPannel();
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
    infoPannel();
}

function insertTable(filename, subject, receiver, maintext) {
    let date = filename.split('.json')[0].split('+')[0];
    let parts = date.split('-');
    var table = document.createElement('table');
    table.width = '100%';
    table.filename = filename;
    table.className = "draftTable";
    table.style.cursor = "pointer";
    table.innerHTML = "<td bgcolor='#eaf1ff' style='padding-left:30px; padding-bottom:10px;'>\
        <table>\
            <th width='60' style='font-weight:normal; vertical-align:top;'>\
                <table>\
                    <tr>\
                        <td style='color:#000000; Arial,sans-serif; font-size:12px; line-height:16px; padding-bottom:6px;'>\
                            <div>" + parts[0] + "-" + parts[1] + "</div>\
                        </td>\
                    </tr>\
                    <tr>\
                        <td style='color:#1e52bd; Arial,sans-serif; font-size:40px; line-height:44px; font-weight:bold;'>\
                            <div>" + parts[2] + "</div>\
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
                            <div style='font-weight:regular;'>to:" + receiver + "</div>\
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
    $("#draftPage")[0].appendChild(table);
}

function bindClickForTables() {
    $('.draftTable').on('click', function(e){
        if($(this)[0].classList.contains("chosen")){
            $(this)[0].classList.remove("chosen");
            $(this)[0].firstChild.firstChild.firstChild.bgColor = "#eaf1ff";
        }
        else{
            $(this)[0].classList.add("chosen");
            $(this)[0].firstChild.firstChild.firstChild.bgColor = "#dde8fd";
        }
    });
}

function bindDblClikForTables(){
    $('.draftTable').on('dblclick', function(e){
        filename = $(this)[0].filename;
        edit_state = "draft";
        edit_from = filename;
        content = JSON.parse(fs.readFileSync(draftPath + filename));
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
        typeSwitch("write", "draft");
    })
}

function loadDrafts() {
    $(".draftTable").each(function() {
        $(this).remove();
    })
    fs.readdir(draftPath, function(err, files) {
        files.reverse();
        if(files.length)
            $("#emptyTip")[0].style.display = "none";
        else
            $("#emptyTip")[0].style.display = "block";
        files.forEach(function(filename) {
            content = JSON.parse(fs.readFileSync(draftPath + filename));
            receiver = content.receiver.split(';')[0]
            receiver = receiver.length > 2 ? receiver[0] + ";..." : receiver;
            subject = content.subject
            subject = subject.length > 30 ? subject.substr(0, 30) + "..." : subject;
            maintext = content.maintext;
            line1 = maintext.indexOf('\n') >= 0 ? maintext.substr(0, maintext.indexOf('\n')) : maintext;
            maintext = line1.substr(0, 30) + "..."
            insertTable(filename, subject, receiver, maintext);
        });
        bindClickForTables();
        bindDblClikForTables();
    });
}


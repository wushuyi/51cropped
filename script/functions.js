function CropAvatar(opts) {
    let that = this;


    var defaultOptions = {
        width: 640,
        height: 360,
        // $cropped
        // $preview
        // $rotate
        // $result
        // $input
        upload: function (blob) {
            console.log(window.URL.createObjectURL(blob));
        }
    };
    var options = $.extend(defaultOptions, opts);
    this.init = function () {
        this.initEvent();
        options.$rotate && options.$rotate.hide();
        options.$result && options.$result.hide();

    };
    this.initCropper = function () {
        var setting = {
            aspectRatio: options.width / options.height,
            viewMode: 1,
            dragMode: 'move',
        };
        if (options.$preview) {
            setting.preview = options.$preview;
        }
        console.log(that.url);
        if (!that.active) {
            that.cropper = options.$cropped.find('img').cropper(setting).data('cropper');
            options.$rotate && options.$rotate.show();
            options.$result && options.$result.show();
            that.active = true;
        } else {
            that.cropper.replace(that.url);
        }
    };
    this.initEvent = function () {
        options.$input && options.$input.on('change.cropped', this.input);
        options.$rotate && options.$rotate.on('click.cropped', this.rotate);
        options.$result && options.$result.on('click.cropped', this.result);
    };
    this.input = function (ev) {
        var file = ev.target.files[0];
        that.url = file && window.URL.createObjectURL(file);
        !that.active && options.$cropped.append('<img src="' + that.url + '"/>');
        that.initCropper();
    };
    this.rotate = function (ev) {
        that.cropper.rotate(parseInt($(this).data('deg')));
    };
    this.result = function (ev) {
        that.cropper.getCroppedCanvas({
            width: options.width,
            height: options.height,
        }).toBlob(function (blob) {
            options.upload && options.upload(blob);
        });
    };
    this.destroy = function () {
        that.cropper && that.cropper.destroy();
        options.$cropped && options.$cropped.find('img').remove();
        options.$input && options.$input.off('.cropped');
        options.$rotate && options.$rotate.off('.cropped');
        options.$result && options.$result.off('.cropped');
        that.active = false;
    };
}

function initQiniu(files, token, qiniu_domain, cb) {
    let $el = $('<input name="qiniujssdk-el" type="file"/>');
    $el.css({
        display: 'none',
    });
    $(document.body).append($el);
    let Qiniu = new QiniuJsSDK();
    let uploader = Qiniu.uploader({
        runtimes: 'html5,flash,html4',      // 上传模式，依次退化
        browse_button: $el.get(0),         // 上传选择的点选按钮，必需
        // 在初始化时，uptoken，uptoken_url，uptoken_func三个参数中必须有一个被设置
        // 切如果提供了多个，其优先级为uptoken > uptoken_url > uptoken_func
        // 其中uptoken是直接提供上传凭证，uptoken_url是提供了获取上传凭证的地址，如果需要定制获取uptoken的过程则可以设置uptoken_func
        uptoken: token, // uptoken是上传凭证，由其他程序生成
        // uptoken_url: '/uptoken',         // Ajax请求uptoken的Url，强烈建议设置（服务端提供）
        // uptoken_func: function(file){    // 在需要获取uptoken时，该方法会被调用
        //    // do something
        //    return uptoken;
        // },
        // get_new_uptoken: false,             // 设置上传文件的时候是否每次都重新获取新的uptoken
        // downtoken_url: '/downtoken',
        // Ajax请求downToken的Url，私有空间时使用，JS-SDK将向该地址POST文件的key和domain，服务端返回的JSON必须包含url字段，url值为该文件的下载地址
        // unique_names: true,              // 默认false，key为文件名。若开启该选项，JS-SDK会为每个文件自动生成key（文件名）
        // save_key: true,                  // 默认false。若在服务端生成uptoken的上传策略中指定了sava_key，则开启，SDK在前端将不对key进行任何处理
        domain: qiniu_domain,     // bucket域名，下载资源时用到，必需
        // container: 'container',             // 上传区域DOM ID，默认是browser_button的父元素
        max_file_size: '100mb',             // 最大文件体积限制
        // flash_swf_url: 'assets/libs/Moxie.swf',  //引入flash，相对路径
        max_retries: 3,                     // 上传失败最大重试次数
        // dragdrop: true,                     // 开启可拖曳上传
        // drop_element: 'container',          // 拖曳上传区域元素的ID，拖曳文件或文件夹后可触发上传
        chunk_size: '4mb',                  // 分块上传时，每块的体积
        auto_start: true,                   // 选择文件后自动上传，若关闭需要自己绑定事件触发上传

        init: {
            'FilesAdded': function (up, files) {
                console.log(arguments, 'FilesAdded');
            },
            'BeforeUpload': function (up, file) {
                console.log(arguments, 'BeforeUpload');
            },
            'UploadProgress': function (up, file) {
                // 每个文件上传时，处理相关的事情
                console.log(arguments, 'UploadProgress');
            },
            'FileUploaded': function (up, file, info) {
                // 每个文件上传成功后，处理相关的事情
                // 其中info是文件上传成功后，服务端返回的json，形式如：
                // {
                //    "hash": "Fh8xVqod2MQ1mocfI4S4KpRL6D98",
                //    "key": "gogopher.jpg"
                //  }
                // 查看简单反馈
                let domain = up.getOption('domain');
                let res = JSON.parse(info.response);
                let sourceLink = qiniu_domain + res.key;// 获取上传成功后的文件的Url
                console.log(arguments, 'FileUploaded');
                console.log(sourceLink);

                files[0].sourceLink = sourceLink;
            },
            'Error': function (up, err, errTip) {
                //上传出错时，处理相关的事情
                console.log(arguments, 'Error');
            },
            'UploadComplete': function () {
                //队列文件处理完毕后，处理相关的事情
                setTimeout(() => {
                    console.log(arguments, 'UploadComplete');
                    cb(files);
                    console.log(files[0].sourceLink, 'UploadComplete');
                    $el.remove();
                }, 1000);
            },
            'Key': function (up, file) {
                return file.getNative().key;
            }
        }
    });
    uploader.bind('Init', function (up, params) {
        files.forEach((file, index, files) => {
            uploader.addFile(file);
        });
    });
};

var $el = $('#vanilla-demo');
var $cropped = $el.find('.cropped');
var $preview = $el.find('.preview');
var $actions = $el.find('.actions');
var test = new CropAvatar({
    width: 80,
    height: 60,
    $cropped: $cropped,
    $preview: $preview,
    $rotate: $actions.find('.vanilla-rotate'),
    $result: $actions.find('.vanilla-result'),
    $input: $actions.find('.vanilla-select'),
    upload: function (file) {
        // var get_uploadtoken = "http://192.168.1.2:8190/upload/token";
        // $.get(get_uploadtoken, function () {
        //     console.log(arguments);
        // });
        var data = {
            "uptoken": "84q-n7v93bZJZc0COio1PG7V7Mp6abQQ6iFQ4yEj:_2ahsB7rdMxl8VyP7ROBKk1UDhU=:eyJzY29wZSI6InN0dWR5LXRlc3QiLCJkZWFkbGluZSI6MTUwNjQ4NTgxMH0=",
            "qiniuUrl": "http://7xszyu.com1.z0.glb.clouddn.com/"
        };
        initQiniu([file], data.uptoken, data.qiniuUrl, function () {
            console.log('ok');
        });
    }
});


test.init();
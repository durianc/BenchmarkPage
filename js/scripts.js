const app = Vue.createApp({

    data() {
        return {
            currentVerificationCode: '',
            isVerified: false,
            abstract: 'To improve the safety of construction sites, this paper constructs a new and publicly available benchmark dataset for helmet-wearing detection, named HWD2024, which consists of 5416 images and 9 classes covering several real-world site conditions. \n' +
                'The HWD2024 dataset was captured using a mobile phone camera, encompassing a wide range of construction scenes, visual ranges, illuminations, individual postures, and occlusions. The dataset comprises 3,176 images for training (HWD2024 train), 1,069 images for validation (HWD2024 val), and 1,171 images for testing (HWD2024 test). The dataset comprises 23,760 instances across the 9 classes (blue, white, yellow, red, orange, none, correct, wrong, and person), with each instance annotated with a class label and its corresponding bounding box. \n' +
                'The former six classes denote the colors of helmets, the following three classes represent the status of wearing a helmet. ‘none’ denotes that the worker is not wearing any helmet, ‘correct’ indicates the worker is wearing a helmet correctly, ensuring effective protection. In contrast, ‘wrong’ means the worker is wearing a helmet incorrectly, rendering it ineffective for safety, including cases where the worker does not fasten the helmet strap or wears the helmet at an improper angle.',
            bibCite: '@article{liaohwd2024,\n' +
                'title={Dataset and approach for helmet-wearing detection with edge devices at construction sites},\n' +
                'author={Longlong, Liao and Wansong, Yan and Beini, Zhang and Xinqi, Liu and Yuqiang, Zheng and Long, Chen and Hong, Lu and Bin, Wang and Yuanlong, Yu},\n' +
                'journal={Submit to the journal of Automation in Construction},\n'+ 
                'pages={00},\n' +  
                'year={2024},\n' +
                'publisher={Elsevier},\n}',
            authors: [
                {id: 1, name: 'Longlong Liao', affiliations: [0, 1]},
                {id: 2, name: 'Wansong Yan', affiliations: [0]},
                {id: 3, name: 'Beini Zhang', affiliations: [1]},
                {id: 4, name: 'Xinqi Liu', affiliations: [1]},
                {id: 5, name: 'Yuqiang Zheng', affiliations: [0]}
                //{id: 6, name: 'Long Chen', affiliations: [0]},
                //{id: 7, name: 'Hong Lu', affiliations: [2]},
                //{id: 8, name: 'Bin Wang', affiliations: [0]},
                //{id: 9, name: 'Yuanlong Yu', affiliations: [0]}
            ],
            uniqueAffiliations: ['Fuzhou University', 'The University of Hong Kong'],
            videoSource: 'static/video.mp4',
            uploadStatus: '',
            uploadedFiles: [],
            isFileUploaded: false,
        };
    },
    created() {
        this.initializeUniqueAffiliations();
    },
    methods: {
        initializeUniqueAffiliations() {
        
            // 更新每个作者的 affiliations 为新 uniqueAffiliations 数组中的索引
            this.authors = this.authors.map(author => ({
                ...author,
                affiliations: author.affiliations.map(index => this.uniqueAffiliations.indexOf(this.uniqueAffiliations[index]) + 1)
            }));
        },        

        //邮箱验证
        checkEmailVerification() {
            const isVerified = localStorage.getItem('isVerified') === 'true';
            const verificationExpiration = parseInt(localStorage.getItem('verificationExpiration'), 10);
            const currentTime = Date.now();

            if (isVerified && currentTime < verificationExpiration) {
                this.isVerified = true;
            } else {
                this.isVerified = false;
                localStorage.removeItem('isVerified');
                localStorage.removeItem('verificationExpiration');
            }
        },

        completeEmailVerification() {
            this.isVerified = true;
            // 保存验证状态到localStorage，并设定一个过期时间戳
            const expirationTime = Date.now() + (3 * 60 * 60 * 1000); // 设置3小时后过期
            localStorage.setItem('isVerified', 'true');
            localStorage.setItem('verificationExpiration', expirationTime.toString());
        },

        showVerificationDialog() {
            // 检查localStorage中的验证状态和过期时间
            const isVerified = localStorage.getItem('isVerified') === 'true';
            const verificationExpiration = parseInt(localStorage.getItem('verificationExpiration'), 10);
            const currentTime = Date.now();
            // 如果用户已验证，并且验证状态未过期
            if (isVerified && currentTime < verificationExpiration) {
                console.log("Your email has been successfully verified.");
                return;
            } else {
                // 重置验证状态
                localStorage.removeItem('isVerified');
                localStorage.removeItem('verificationExpiration');
                this.isVerified = false;
                // 显示邮箱验证对话框
                const email = prompt("Please provide your email address for verification:");
                window.userEmail = email;   // 全局变量,方便后期获取开发模型的研究者的邮箱
                if (email) {
                    this.sendVerificationEmail(email);
                }
            }
        },

        async sendVerificationEmail(email) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                alert("无效的电子邮件地址。");
                return;
            }
            if (!email.includes('edu')) {
                alert("Only email addresses containing' edu' are allowed.");
                return;
            }
            const verificationCode = this.generateVerificationCode();
            this.currentVerificationCode = verificationCode;
            try {
                await this.sendEmail(email, verificationCode);
                // 提示用户检查电子邮件
                const userHasCheckedEmail = confirm("The verification code has been dispatched to your designated email address. Please click 'confirm' button.");
                if (userHasCheckedEmail) {
                    // 用户点击'确定'后再提示输入验证码
                    const userVerificationCode = prompt("Please enter the received verification code:");
                    if (this.verifyEmail(email, userVerificationCode)) {
                        this.completeEmailVerification();
                        alert("E-mail verification succeeded!");
                    } else {
                        alert("Email verification failed, please make sure that the verification code entered is correct.");
                    }
                }
            } catch (error) {
                alert("Email sending failed. Please check whether your email address is correct.");
            }
        },

        generateVerificationCode() {
            const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let verificationCode = "";

            for (let i = 0; i < 6; i++) {
                const randomIndex = Math.floor(Math.random() * characters.length);
                verificationCode += characters.charAt(randomIndex);
            }

            return verificationCode;
        },

        sendEmail(email, verificationCode) {
            emailjs.init("4loqiVzumJzrZNyC1"); // Replace with your own EmailJS user ID

            const templateParams = {
                to_email: email,
                verification_code: verificationCode
            };

            return emailjs.send('service_il1vr5g', 'template_pxpjip8', templateParams);
        },
        verifyEmail(email, userVerificationCode) {
            return userVerificationCode === this.currentVerificationCode;
        },

        triggerFileUpload() {
            if (!this.isVerified) {
                this.showVerificationDialog();
                return;
            }
            this.$refs.fileInput.click();
        },


        handleFilesUpload(event) {
            const files = event.target.files;
            if (files.length === 0) {
                return; // 如果没有文件被选中，直接返回
            }
            // 仅处理第一个文件
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    // 解析文件内容为JSON
                    const fileContent = JSON.parse(e.target.result);
                    // 推入对象，包含文件名和文件内容
                    this.uploadedFiles.push({
                        name: file.name,
                        content: fileContent
                    });
                    this.uploadStatus = "File uploaded successfully!"; // 更新上传状态
                    this.isFileUploaded = true;
                } catch (error) {
                    this.uploadStatus = "File parsing error. Please upload a valid JSON file!"; // 设置错误信息
                }
            };
            reader.readAsText(file);

            // 更新全局变量
            window.uploadedFiles = this.uploadedFiles;

            // 重置文件输入，允许再次上传相同文件
            event.target.value = '';  // 添加这一行代码
        },

    },
    mounted() {
        this.checkEmailVerification();
    },

});
const appInstance = app.mount('#app');
window.vueApp = appInstance;

document.getElementById("exportToJsonModal").addEventListener("click", function () {
    // 假设您已经有了一个或多个要导出的模型输出数据
    var modelOutput = window.eval_result; // 使用window.eval_result作为示例，您可以根据需要调整
    if (modelOutput.length === 0) {
        alert("没有可导出的数据！");
        return;
    }
    // 调用保存为JSON文件的函数
    // 假设您要为文件命名为"modelOutput.json"
    saveAsJSONFile(modelOutput, "modelOutput.json", "application/json");
});
document.getElementById("exportToXlsxModal").addEventListener("click", function () {
    // 同样，假设您已经有了一个或多个要导出的模型输出数据
    var modelOutput = window.eval_result; // 使用window.eval_result作为示例
    if (modelOutput.length === 0) {
        alert("没有可导出的数据！");
        return;
    }
    // 调用保存为XLSX文件的函数
    // 假设您要为文件命名为"modelOutput.xlsx"
    saveAsExcelFile(modelOutput, "modelOutput");
});

document.addEventListener('DOMContentLoaded', (event) => {
    // 页面加载时检查localStorage，并恢复表格数据
    const storedData = localStorage.getItem('tableData');
    if (storedData) {
        const tableData = JSON.parse(storedData);
        generateTableHtml(tableData);
    }
});

window.eval_result = []; // 用于保存模型输出数据
window.processedModels = []; // 用于跟踪已处理的模型
window.maxMap = 0.94; // 新增全局变量用于保存当前最大的mAP值

document.getElementById('uploadCodeButton').addEventListener('click', function() {
    document.getElementById('codeFileUpload').click();
});
document.getElementById('uploadModelButton').addEventListener('click', function() {
    document.getElementById('modelFileUpload').click();
});
document.getElementById('codeFileUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        if (validateFileType(file, 'code')) {
            handleFileUpload(file, 'code');
        } else {
            alert('Invalid file type for code. Please upload a .zip file.');
        }
    }
});
document.getElementById('modelFileUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        if (validateFileType(file, 'model')) {
            handleFileUpload(file, 'model');
        } else {
            alert('Invalid file type for model. Please upload a .pt or .pth file.');
        }
    }
});

function validateFileType(file, type) {
    const codeExtensions = ['.zip'];
    const modelExtensions = ['.pt', '.pth'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = (extensions) => extensions.some(ext => fileName.endsWith(ext));

    if (type === 'code') {
        return isValidExtension(codeExtensions);
    } else if (type === 'model') {
        return isValidExtension(modelExtensions);
    }
    return false;
}

function handleFileUpload(file, type) {
    var formData = new FormData();
    formData.append("file", file);

    fetch(`/hwd/upload/${file.name}`, {
        method: 'PUT',
        body: formData
    }).then(response => {
        if (response.ok) {
            console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} file uploaded successfully`);
        } else {
            response.text().then(text => {
                console.error(`${type.charAt(0).toUpperCase() + type.slice(1)} file upload failed:`, text);
            });
        }
    }).catch(error => {
        console.error('Error:', error);
    });
}

function save_result(result) {
    var parsedResult = JSON.parse(result);
    var modal = document.getElementById("myModal");
    var modalText = document.getElementById("modalText");
    var span = document.getElementsByClassName("close")[0];
    var confirmBtn = document.getElementById("confirmButton");
    var uploadCodeBtn = document.getElementById("uploadCodeButton");
    var uploadModelBtn = document.getElementById("uploadModelButton");
    let isNewBestResult = false;

    var betterResultNotice = document.getElementById("betterResultNotice");
    betterResultNotice.innerHTML = "";
    betterResultNotice.style.display = "none";

    var resultNotice = document.getElementById("resultNotice");
    resultNotice.innerHTML = "";
    resultNotice.style.display = "none";

    parsedResult.forEach((modelOutput) => {
        if (window.processedModels.includes(modelOutput.Model)) {
            return;
        }

        console.log("modelOutput.Metric: ", modelOutput.Metric)
        modelOutput.Metric.forEach(metric => {
            if (metric.Type === "mAP@.5") {
                if (metric.Overall >= window.maxMap) {
                    isNewBestResult = true;
                }
            }
        });

        if (isNewBestResult) {
            confirmBtn.style.display = "inline-block";
            uploadCodeBtn.style.display = "inline-block";
            uploadModelBtn.style.display = "inline-block";
            betterResultNotice.innerHTML = "<br><mark>This is the best result so far!</mark>";
            betterResultNotice.style.display = "block";
        } else {
            confirmBtn.style.display = "none";
            uploadCodeBtn.style.display = "none";
            uploadModelBtn.style.display = "none";
            resultNotice.innerHTML = "<br>Sorry, your model results are not better than the current best results.";
            resultNotice.style.display = "block";
        }

        let content = `<b>Model: ${modelOutput.Model} (<a href="data/weights/${modelOutput.Model}.pt" download>Weight</a>, <a href="data/code_sample.zip download>Code</a>)</b><br>`;
        content += `<table border="1"><tr><th>Type</th><th>Overall</th>`;
        Object.keys(modelOutput.Metric[0].Details).forEach(key => {
            content += `<th>${key}</th>`;
        });
        content += `</tr>`;

        modelOutput.Metric.forEach(metric => {
            content += `<tr><td>${metric.Type}</td><td>${metric.Overall}</td>`;
            Object.values(metric.Details).forEach(value => {
                content += `<td>${value}</td>`;
            });
            content += `</tr>`;
        });

        content += `</table>`;

        modalText.innerHTML = content;
        modal.style.display = "block";

        span.onclick = function () {
            modal.style.display = "none";
            window.processedModels.push(modelOutput.Model);
        }

        confirmBtn.onclick = function () {
            window.eval_result = window.eval_result.concat(parsedResult);
            window.eval_result.forEach(result => {
                result.Metric.forEach(metric => {
                    if (metric.Type === "mAP@.5" && metric.Overall > window.maxMap) {
                        console.log(metric.Overall, window.maxMap);
                        window.maxMap = metric.Overall;
                    }
                });
            });

            console.log("Confirmed new max mAP: ", window.maxMap);

            generateTableHtml(window.eval_result); 
            modal.style.display = "none";
        };

        window.onclick = function (event) {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        }
    });

    window.vueApp.uploadedFiles = [];
}



function generateTableHtml(modelOutputs) {
    if (!Array.isArray(modelOutputs) || modelOutputs.length === 0) {
        return "<p>No data provided.</p>";
    }
    // console.log(typeof modelOutputs)
    localStorage.setItem('tableData', JSON.stringify(modelOutputs));

    let resultDiv = document.getElementById("result_table");
    let resultTable = resultDiv.getElementsByTagName("table")[0] || document.createElement("table");

    modelOutputs.forEach(modelOutput => {
        let firstMetric = true; // 用于跟踪是否是每个模型的第一个指标
        let metricCount = modelOutput['Metric'].length; // 获取当前模型的指标数量

        modelOutput['Metric'].forEach(metric => {
            let rowId = `row-${modelOutput['Model'].replace(/\s/g, '_')}-${metric['Type'].replace(/\s/g, '_')}`;

            if (!document.getElementById(rowId)) {
                let tr = document.createElement("tr");
                tr.id = rowId;

                if (firstMetric) {
                    let modelTd = document.createElement("td");
                    modelTd.textContent = modelOutput['Model'];
                    // console.log(window.userEmail+'Test Test')
                    modelTd.setAttribute('title', window.userEmail); // 设置td的title属性
                    modelTd.rowSpan = metricCount; // 设置跨行数为指标数量
                    tr.appendChild(modelTd);
                    firstMetric = false;
                }

                let metricTd = document.createElement("td");
                metricTd.textContent = metric['Type'].replace(/^mAP/, '');  // 使用.replace()方法去除开头的'mAP'
                tr.appendChild(metricTd);


                let overallTd = document.createElement("td");
                overallTd.textContent = metric['Overall'];
                tr.appendChild(overallTd);

                Object.values(metric['Details']).forEach(value => {
                    let detailTd = document.createElement("td");
                    detailTd.textContent = value;
                    tr.appendChild(detailTd);
                });

                resultTable.appendChild(tr);
            }
        });
    });

    if (!resultTable.parentElement) {
        resultDiv.appendChild(resultTable);
    }
}

function saveAsJSONFile(modelOutput, filename, type) {
    const dataStr = JSON.stringify([modelOutput]); // 将单个模型输出封装成数组
    const file = new Blob([dataStr], {type: type});
    const a = document.createElement('a');
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

function flattenDataForExcel(data) {
    // 我们需要处理每个Model下的Metric数组
    let flatData = [];
    data.forEach(model => {
        model.Metric.forEach(metric => {
            // 对于每个Metric，扁平化Details部分并与顶层属性合并
            const flatDetails = metric.Details ?
                Object.entries(metric.Details).reduce((details, [key, value]) => {
                    details[key] = value;
                    return details;
                }, {}) : {};

            flatData.push({
                Model: model.Model,
                Type: metric.Type,
                Overall: metric.Overall,
                ...flatDetails // 将扁平化后的Details属性合并
            });
        });
    });
    return flatData;
}

function saveAsExcelFile(modelOutput, fileName) {
    const data = flattenDataForExcel([modelOutput]); // 将单个模型输出封装成数组并转换
    try {
        // 同之前的逻辑，创建工作簿和工作表
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } catch (e) {
        console.error('Error saving Excel file:', e);
    }
}

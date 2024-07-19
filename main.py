import pyodide
# import matplotlib.pyplot as plt
import numpy as np
import json
# import random
# import js
from js import document, FileReader, JSON, console, window
from pyscript import display
from pyodide.http import open_url

"""
用于前端对接
处理模型评估逻辑
"""




# 读取 JSON 文件
# class JSONRead:
#     url = "./base_predictions.json"
#     def __init__(self):
#         self.data = json.loads(open_url(self.url).read())
#
#     def processJson(self, event):
#         print(self.data)
#         console.log(self.data)
#         return self.data


# 加载JSON文件
def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:  # Specify the correct encoding here
        return json.load(f)


# 创建字典来存储score和category_id值
def create_score_category_dicts(pred):
    score_dict = {}
    category_dict = {}
    for item in pred:
        image_id = item["image_id"]
        score = item["score"]
        category_id = item["category_id"]

        if image_id in score_dict:
            score_dict[image_id].append(score)
            category_dict[image_id].append(category_id)
        else:
            score_dict[image_id] = [score]
            category_dict[image_id] = [category_id]
    return score_dict, category_dict


def create_tcls_dict(anno):
    tcls = {}
    for annotation in anno["annotations"]:
        image_id = annotation["image_id"]
        category_id = annotation["category_id"]

        file_name = next((image["file_name"] for image in anno["images"] if image["id"] == image_id), None)

        if file_name in tcls:
            tcls[file_name].append(category_id)
        else:
            tcls[file_name] = [category_id]
    return tcls


def merge_lists(score_dict, category_dict, tcls, correct):
    result = []

    for i, file_name in enumerate(score_dict.keys()):
        score_list = score_dict[file_name]
        category_list = category_dict[file_name]
        tcls_list = tcls[file_name]

        merged_list = [
            correct[i],
            np.array(score_list),
            np.array(category_list),
            np.array(tcls_list)
        ]

        result.append(merged_list)
    return result


def compute_ap(recall, precision):
    mrec = np.concatenate(([0.], recall, [recall[-1] + 0.01]))
    mpre = np.concatenate(([1.], precision, [0.]))

    mpre = np.flip(np.maximum.accumulate(np.flip(mpre)))

    method = 'interp'
    if method == 'interp':
        x = np.linspace(0, 1, 101)
        ap = np.trapz(np.interp(x, mrec, mpre), x)
    else:
        i = np.where(mrec[1:] != mrec[:-1])[0]
        ap = np.sum((mrec[i + 1] - mrec[i]) * mpre[i + 1])

    return ap, mpre, mrec


def ap_per_class(tp, conf, pred_cls, target_cls):
    i = np.argsort(-conf)
    tp, conf, pred_cls = tp[i], conf[i], pred_cls[i]

    unique_classes = np.unique(target_cls)
    nc = unique_classes.shape[0]

    px, py = np.linspace(0, 1, 1000), []
    ap, p, r = np.zeros((nc, tp.shape[1])), np.zeros((nc, 1000)), np.zeros((nc, 1000))
    for ci, c in enumerate(unique_classes):
        i = pred_cls == c
        n_l = (target_cls == c).sum()
        n_p = i.sum()

        if n_p == 0 or n_l == 0:
            continue
        else:
            fpc = (1 - tp[i]).cumsum(0)
            tpc = tp[i].cumsum(0)

            recall = tpc / (n_l + 1e-16)
            r[ci] = np.interp(-px, -conf[i], recall[:, 0], left=0)

            precision = tpc / (tpc + fpc)
            p[ci] = np.interp(-px, -conf[i], precision[:, 0], left=1)

            for j in range(tp.shape[1]):
                ap[ci, j], mpre, mrec = compute_ap(recall[:, j], precision[:, j])

    f1 = 2 * p * r / (p + r + 1e-16)

    i = f1.mean(0).argmax()
    return p[:, i], r[:, i], ap, f1[:, i], unique_classes


def main(pred_names, preds, anno):
    mAPs = {}
    details = {}  # 存储每个模型的详细信息
    for path_pred in pred_names:
        # 直接从preds字典中获取预测数据
        pred = preds[path_pred]

        score_dict, category_dict = create_score_category_dicts(pred)
        tcls = create_tcls_dict(anno)

        if 'case1' in path_pred:
            correct = anno["correct_2"]
        elif 'case2' in path_pred:
            correct = anno["correct_3"]
        else:
            correct = anno["correct_1"]

        result = merge_lists(score_dict, category_dict, tcls, correct)
        result = [np.concatenate(x, 0) for x in zip(*result)]

        nc = 9
        seen = 1171
        if len(result) and result[0].any():
            p, r, ap, f1, ap_class = ap_per_class(*result)
            ap50, ap = ap[:, 0], ap.mean(1)
            mp, mr, map50, map = p.mean(), r.mean(), ap50.mean(), ap.mean()
            nt = np.bincount(result[3], minlength=nc)
        else:
            nt = np.zeros(1)

        s = ('%20s' + '%12s' * 6) % ('Class', 'Images', 'Labels', 'P', 'R', 'mAP@.5', 'mAP@.5:.95')
        print(s)

        pf = '%20s' + '%12i' * 2 + '%12.3g' * 4
        print(pf % ('all', seen, nt.sum(), mp, mr, map50, map))
        model_details = {
            "seen": seen,
            "nt": nt.sum(),
            "mp": mp,
            "mr": mr,
            "map50": map50,
            "map": map,
            "ap_class": ap_class,
            "p": p,
            "r": r,
            "ap50_class": ap50,
            "ap_class": ap,
        }
        details[path_pred] = model_details

        names = ["blue", "white", "yellow", "red", "none", "correct", "person", "orange", "wrong"]
        for i, c in enumerate(ap_class):
            print(pf % (names[c], seen, nt[c], p[i], r[i], ap50[i], ap[i]))

        print("\n")

    return details


# 注意: 本代码片段中伪代码部分(create_score_category_dicts, create_tcls_dict, merge_lists, ap_per_class)需要根据你实际的函数实现进行替换。
class Action:
    annotation_url = "data/annotation_test.json"
    predictions_urls = ["data/predictions/YOLOv7-tRPA.json", "data/predictions/YOLOv7-tRPA-case1.json", "data/predictions/YOLOv7-tRPA-case2.json"]
    def __init__(self):
        self.data = {}
        self.annotation_data = json.loads(open_url(self.annotation_url).read())
        
        # 遍历预测结果的 URL 列表
        for url in self.predictions_urls:
            # 使用 split 方法分割 URL，并取最后一个元素作为文件名
            file_name = url.split('/')[-1]
            # 读取并解析预测结果文件
            self.data[file_name] = json.loads(open_url(url).read())
        
        
        self.processJson()

    def processJson(self):
        # 在这里处理你的JSON数据
        # print(self.data)  
        # # 或使用 console.log(self.data) 如果你想在JavaScript控制台看到输出
        self.evaluation_results = self.evaluate_model()

    def generate_output(self, details, names):
        output = []
        json_data = []
        for model, data in details.items():
            model_name = model.split("/")[-1].split(".")[0].replace("_predictions", "")
            model_output = {
                "Model": model_name,
                "Metric": [
                    {
                        "Type": "mAP@.5",
                        "Overall": round(data["map50"], 3),
                        "Details": {name: round(data["ap50_class"][i], 3) for i, name in enumerate(names)}
                    },
                    {
                        "Type": "mAP@.5:.95",
                        "Overall": round(data["map"], 3),
                        "Details": {name: round(data["ap_class"][i], 3) for i, name in enumerate(names)}
                    }
                ]
            }
            output.append(model_output)

        #         # 只为 JSON 数据添加模型名和Overall的值
        #         json_model_output = {
        #             "Model": model_name,
        #             "mAP@.5": round(data["map50"], 3)
        #         }
        #         json_data.append(json_model_output)
        #
        # # 将简化的数据转换为 JSON 字符串
        # json_output = json.dumps(json_data)
        # # 使用 PyScript 提供的接口直接调用 JavaScript 函数，并将 JSON 格式的结果作为参数传递
        # window.save_result(json_output)

        return output

    def evaluate_model(self):
        # 在这里进行模型评估
        # print("进行模型评估....")
        # print(self.data)
        details = main(self.data.keys(), self.data, self.annotation_data)
        output = self.generate_output(details,
                                      names=["blue", "white", "yellow", "red", "none", "correct", "person", "orange",
                                             "wrong"])
        # console.log(json.dumps(output, indent=4))
        self.generate_table_html(output)

    def generate_table_html(self, model_outputs):
        if not model_outputs:
            return "<p>No data provided.</p>"

        # 生成表格的开头和表头
        columns = ['Model', 'Metric', 'Overall'] + list(model_outputs[0]['Metric'][0]['Details'].keys())
        table_html = "<table border='1'><tr>"  # 开始表格和表头
        for col in columns:
            table_html += f"<th>{col}</th>"
        table_html += "</tr>"  # 结束表头行

        # 遍历所有模型的输出
        for model_output in model_outputs:
            metrics_count = len(model_output['Metric'])  # 获取当前模型的Metric数量
            first_metric = True  # 标记第一个Metric，以确定何时添加带rowspan的模型名称单元格

            for metric in model_output['Metric']:
                table_html += "<tr>"
                if first_metric:
                    # 如果是第一个Metric，添加带rowspan属性的模型名称单元格
                    model_name = model_output['Model']
                    weight_link = f"<a href='data/weights/{model_name}.pt' download>Weight</a>"
                    code_link = f"<a href='data/code_sample.zip' download>Code</a>"
                    table_html += f"<td rowspan='{metrics_count}'>{model_name} ({weight_link}, {code_link})</td>"
                    first_metric = False  # 更新标记，只在第一个Metric处添加带rowspan的模型名称单元格

                # 创建表格行，显示Metric Type, Overall以及Details的值
                table_html += f"<td>{metric['Type']}</td><td>{metric['Overall']}</td>"
                for _, value in metric['Details'].items():
                    table_html += f"<td>{value}</td>"
                table_html += "</tr>"  # 结束当前Metric的行

        table_html += "</table>"  # 结束表格

        # 使用Pyodide将HTML设置到页面上的某个元素，这是示例代码，具体实现依赖于你的环境
        document.getElementById("result_table").innerHTML = table_html
        return table_html

class newAction:
    annotation_url = "data/annotation_test.json"
    
    def __init__(self):
        self.data = {}
        self.annotation_data = json.loads(open_url(self.annotation_url).read())
        
        

    def load_json_files(self, *args, **kwargs):
        # print("调用load_json_files...")
        # 使用 js.window 直接访问 JavaScript 变量
        uploaded_files_js = window.uploadedFiles.to_py()  # 将 JsProxy 转换为 Python 列表
        for uploaded_file in uploaded_files_js:
            # 假设 uploaded_file 是一个字典，已经包含了文件的内容和文件名
            file_content = uploaded_file['content']  # 这里不再是 JsProxy
            file_name = uploaded_file['name']
            # 检查 file_content 是否是字符串，如果是则解析JSON
            if isinstance(file_content, str):
                json_data = json.loads(file_content)
                self.data[file_name] = json_data
            else:
                # 如果 file_content 已经是一个对象，则直接赋值
                self.data[file_name] = file_content

        self.processJson()

    def processJson(self):
        # 在这里处理你的JSON数据
        # print(self.data)  
        # # 或使用 console.log(self.data) 如果你想在JavaScript控制台看到输出
        self.evaluation_results = self.evaluate_model()

    def generate_output(self, details, names):
        output = []
        json_data = []
        for model, data in details.items():
            model_name = model.split("/")[-1].split(".")[0].replace("_predictions", "")
            model_output = {
                "Model": model_name,
                "Metric": [
                    {
                        "Type": "mAP@.5",
                        "Overall": round(data["map50"], 3),
                        "Details": {name: round(data["ap50_class"][i], 3) for i, name in enumerate(names)}
                    },
                    {
                        "Type": "mAP@.5:.95",
                        "Overall": round(data["map"], 3),
                        "Details": {name: round(data["ap_class"][i], 3) for i, name in enumerate(names)}
                    }
                ]
            }
            output.append(model_output)

        #         # 只为 JSON 数据添加模型名和Overall的值
        #         json_model_output = {
        #             "Model": model_name,
        #             "mAP@.5": round(data["map50"], 3)
        #         }
        #         json_data.append(json_model_output)
        #
        # # 将简化的数据转换为 JSON 字符串
        # json_output = json.dumps(json_data)
        # # 使用 PyScript 提供的接口直接调用 JavaScript 函数，并将 JSON 格式的结果作为参数传递
        # window.save_result(json_output)

        return output

    def evaluate_model(self):
        # 在这里进行模型评估
        print("进行模型评估....")
        print(self.data)
        details = main(self.data.keys(), self.data, self.annotation_data)
        output = self.generate_output(details,
                                      names=["blue", "white", "yellow", "red", "none", "correct", "person", "orange",
                                             "wrong"])
        # console.log(json.dumps(output, indent=4))
        self.generate_table_html(output)

    def generate_table_html(self, model_outputs):
        # 转为JSON字符串
        modelOutputs = json.dumps(model_outputs)
        window.save_result(modelOutputs)



"""
How to use:
doAction类
urls存放预测文件的url,可定义任意数量待评估的预测文件
annotation_url存放标注文件的url
"""
act = Action()
newact = newAction()


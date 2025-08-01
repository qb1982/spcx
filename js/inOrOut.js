// 商品出入库 // inOrOut.js

import { api } from './api.js';

// DOM元素
const inTableBody = document.getElementById('warehouseInTableBody');
const outTableBody = document.getElementById('warehouseOutTableBody');

// 初始化商品入库模块，改为异步函数
export async function initWarehouseIn() {
    await initWarehouseCommon('warehouseIn', inTableBody);
}

// 初始化商品出库模块，改为异步函数
export async function initWarehouseOut() {
    await initWarehouseCommon('warehouseOut', outTableBody);
}

// 初始化供方和客户名称下拉框事件
function initDropdownEvents(sectionId) {
    
    const supplierInput = document.getElementById(sectionId === 'warehouseIn'?'supplier':'customer');
    const supplierDropdown = document.getElementById(sectionId === 'warehouseIn'?'supplierDropdown':'customerDropdown');

    if (supplierInput && supplierDropdown) {
        // 供方或客户输入框点击事件
        supplierInput.addEventListener('click', () => {
            const suppliers = Array.from(api[sectionId === 'warehouseIn' ? 'suppliers' : 'customers'].keys());
            supplierDropdown.innerHTML = '';
            suppliers.forEach(supplier => {
                const option = document.createElement('div');
                option.textContent = supplier;
                option.addEventListener('click', () => {
                    supplierInput.value = supplier;
                    supplierDropdown.classList.add('hidden');
                });
                supplierDropdown.appendChild(option);
            });
            supplierDropdown.classList.remove('hidden');
        });

        // 添加输入事件监听，实现筛选功能
        supplierInput.addEventListener('input', () => {
            const inputValue = supplierInput.value.toLowerCase();
            const suppliers = Array.from(api[sectionId === 'warehouseIn' ? 'suppliers' : 'customers'].keys());
            supplierDropdown.innerHTML = '';

            suppliers.forEach(supplier => {
                if (supplier.toLowerCase().includes(inputValue)) {
                    const option = document.createElement('div');
                    option.textContent = supplier;
                    option.addEventListener('click', () => {
                        supplierInput.value = supplier;
                        supplierDropdown.classList.add('hidden');
                    });
                    supplierDropdown.appendChild(option);
                }
            });

            if (inputValue) {
                supplierDropdown.classList.remove('hidden');
            }
        });
    }

    // 点击页面其他区域隐藏下拉框
    document.addEventListener('click', (e) => {
        if (supplierDropdown && !supplierInput?.contains(e.target)) {
            supplierDropdown.classList.add('hidden');
        }
    });
}

// 通用初始化函数，确保动态创建初始行
async function initWarehouseCommon(sectionId, tableBody) {
    // 初始化下拉框事件
    initDropdownEvents(sectionId);

    // 获取添加行按钮，根据 sectionId 区分不同的按钮 id
    const addRowButton = document.getElementById(sectionId === 'warehouseIn' ? 'addWarehouseRow' : 'addWarehouseOutRow');

    // 绑定添加行事件
    if (addRowButton) {
        addRowButton.addEventListener('click', () => addDynamicRow(tableBody));
    }

    // 管理表格状态，清空现有行
    manageTableState(tableBody, true);

    // 根据登录状态初始化行数
    if (api.isAuthenticated) {
        for (let i = 0; i < 5; i++) {
            addDynamicRow(tableBody);
        }
    }

    // 绑定提交事件
    bindEvents(sectionId, tableBody);

    // 计算总金额
    updateTotalAmount(tableBody);

    const prefix = sectionId === 'warehouseIn' ? 'in-' : 'out-';
    const dateInput = document.getElementById(prefix + 'date');
    const orderNumberInput = document.getElementById(prefix + 'order-number');

    if (dateInput && orderNumberInput) {
        // 初始化单号
        dateInput.value = new Date().toISOString().substring(0, 10);
        const initialDate = dateInput.value;
        orderNumberInput.value = generateUniqueOrderNumber(initialDate, sectionId);
        orderNumberInput.readOnly = false;

        // 日期修改事件监听
        dateInput.addEventListener('change', () => {
            orderNumberInput.value = generateUniqueOrderNumber(dateInput.value, sectionId);
        });

        // 单号修改事件监听
        orderNumberInput.addEventListener('change', () => {
            const currentDate = dateInput.value;
            const orderNumber = orderNumberInput.value;
            const prefix = sectionId === 'warehouseIn' ? 'RKD' : 'CKD';
            const dateStr = currentDate.replace(/-/g, '');
            const regex = new RegExp(`^${prefix}${dateStr}\d{3}$`);

            // 格式校验
            if (!regex.test(orderNumber)) {
                showNotification('错误', '单号格式不正确，请使用正确格式或让系统自动生成。');
                orderNumberInput.value = generateUniqueOrderNumber(currentDate, sectionId);
                return;
            }

            // 存在性校验
            if (api.allData.some(item => item.dh === orderNumber)) {
                showNotification('错误', '该单号已存在，请使用其他单号或让系统自动生成。');
                orderNumberInput.value = generateUniqueOrderNumber(currentDate, sectionId);
            }
        });
    }
}

// 添加动态行函数
function addDynamicRow(tableBody) {
    const rowIndex = tableBody.rows.length;
    const row = document.createElement('tr');

    // 序号
    const indexCell = document.createElement('td');
    indexCell.className = 'border border-gray-300 px-4 py-2 text-center text-sm';
    indexCell.textContent = rowIndex;
    row.appendChild(indexCell);

    // 商品选择下拉框
    const productCell = document.createElement('td');
    productCell.className = 'border border-gray-300 px-4 py-2 relative';
    const productInput = document.createElement('input');
    productInput.type = 'text';
    productInput.className = 'w-full border border-gray-200 rounded px-2 py-1 text-sm';
    productInput.placeholder = '输入商品名称';
    productCell.appendChild(productInput);

    // 创建下拉列表容器
    const dropdown = document.createElement('div');
    // 宽度为与输入框一致，移除 w-[120%]
    dropdown.className = 'absolute bg-white border border-gray-200 z-50 max-h-64 overflow-y-auto hidden';
    // 将下拉框添加到 body 下
    document.body.appendChild(dropdown);

    // 为下拉框添加引用，方便后续删除
    row._dropdown = dropdown;

    // 输入事件监听
    productInput.addEventListener('input', (e) => {
        const inputValue = e.target.value.toLowerCase();
        const filteredProducts = Array.from(api.allProduct.keys()).filter(name =>
            name.toLowerCase().includes(inputValue)
        );

        // 清空下拉框
        dropdown.innerHTML = '';

        filteredProducts.forEach(name => {
            const option = document.createElement('div');
            option.className = 'p-2 hover:bg-gray-100 cursor-pointer';
            option.textContent = name;
            option.addEventListener('click', () => {
                productInput.value = name;
                // 获取商品信息并填充单位和单价
                const productInfo = api.allProduct.get(name);
                if (productInfo) {
                    unitInput.value = productInfo.unit;
                    quantityInput.value = 1;
                    priceInput.value = productInfo.newPrice / 2;
                    amountInput.value = priceInput.value;
                    // 计算金额
                    calculateAmount();
                }
                dropdown.classList.add('hidden');
            });
            dropdown.appendChild(option);
        });
        if (filteredProducts.length > 0) {
            // 获取输入框的位置
            const rect = productInput.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            // 设置下拉框宽度与输入框一致
            dropdown.style.width = rect.width + 'px';

            if (spaceBelow < 256 && spaceAbove >= 256) {
                // 上方显示
                dropdown.style.top = (rect.top + scrollTop - dropdown.offsetHeight) + 'px';
                dropdown.style.left = (rect.left + scrollLeft) + 'px';
            } else {
                // 下方显示
                dropdown.style.top = (rect.bottom + scrollTop) + 'px';
                dropdown.style.left = (rect.left + scrollLeft) + 'px';
            }
            dropdown.classList.remove('hidden');
        } else {
            dropdown.classList.add('hidden');
        }
    });

    // 添加键盘事件监听
    productInput.addEventListener('keydown', (e) => {
        const options = Array.from(dropdown.querySelectorAll('div'));
        const selectedIndex = options.findIndex(option => option.classList.contains('bg-gray-200'));
        let newIndex = selectedIndex;

        if (options.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                newIndex = (selectedIndex === -1 ? 0 : (selectedIndex + 1) % options.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                newIndex = (selectedIndex === -1 ? options.length - 1 : (selectedIndex - 1 + options.length) % options.length);
                break;
            case 'Enter':
                if (selectedIndex !== -1) {
                    e.preventDefault();
                    const selectedOption = options[selectedIndex];
                    productInput.value = selectedOption.textContent;
                    const productInfo = api.allProduct.get(selectedOption.textContent);
                    if (productInfo) {
                        unitInput.value = productInfo.unit;
                        quantityInput.value = 1;
                        priceInput.value = productInfo.newPrice / 2;
                        amountInput.value = priceInput.value;
                    }
                    dropdown.classList.add('hidden');
                }
                break;
        }

        // 更新选中状态
        options.forEach(option => option.classList.remove('bg-gray-200'));
        if (newIndex !== -1) {
            options[newIndex].classList.add('bg-gray-200');
        }
    });

    // 点击外部隐藏下拉框事件需要更新，检查是否点击了输入框或下拉框本身
    if (!document._productDropdownClickHandler) {
        document._productDropdownClickHandler = function (e) {
            if (!productInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        };
        document.addEventListener('click', document._productDropdownClickHandler);
    }

    row.appendChild(productCell);

    // 单位输入框
    const unitCell = document.createElement('td');
    unitCell.className = 'border border-gray-300 px-4 py-2';
    const unitInput = document.createElement('input');
    unitInput.type = 'text';
    unitInput.className = 'w-full border border-gray-200 rounded px-2 py-1 text-sm';
    unitInput.placeholder = '个/件';
    unitCell.appendChild(unitInput);
    row.appendChild(unitCell);

    // 数量输入框
    const quantityCell = document.createElement('td');
    quantityCell.className = 'border border-gray-300 px-4 py-2';
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.className = 'quantity w-full border border-gray-200 rounded px-2 py-1 text-sm';
    quantityInput.placeholder = '0';
    quantityCell.appendChild(quantityInput);
    row.appendChild(quantityCell);

    // 单价输入框
    const priceCell = document.createElement('td');
    priceCell.className = 'border border-gray-300 px-4 py-2';
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.min = '0.01';
    priceInput.step = '0.01';
    priceInput.className = 'price w-full border border-gray-200 rounded px-2 py-1 text-sm';
    priceInput.placeholder = '0.00';
    priceCell.appendChild(priceInput);
    row.appendChild(priceCell);

    // 金额输入框
    const amountCell = document.createElement('td');
    amountCell.className = 'border border-gray-300 px-4 py-2';
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.step = '0.01';
    amountInput.min = '0';
    amountInput.className = 'price w-full border border-gray-200 rounded px-2 py-1 text-sm';
    amountInput.placeholder = '0.00';
    amountCell.appendChild(amountInput);
    row.appendChild(amountCell);

    // 定义计算函数
    const calculateAmount = () => {
        const quantity = parseFloat(quantityInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        amountInput.value = (quantity * price).toFixed(2);
        // 添加更新合计金额的调用
        updateTotalAmount(tableBody);
    };

    const calculatePrice = () => {
        const quantity = parseFloat(quantityInput.value) || 0;
        const amount = parseFloat(amountInput.value) || 0;
        if (quantity > 0) {
            priceInput.value = (amount / quantity).toFixed(2);
        }
    };

    // 为数量和单价输入框添加输入事件监听
    quantityInput.addEventListener('input', calculateAmount);
    priceInput.addEventListener('input', calculateAmount);

    // 为金额输入框添加输入事件监听
    amountInput.addEventListener('input', () => {
        calculatePrice();
        updateTotalAmount(tableBody);
    });

    // 删除按钮
    const actionCell = document.createElement('td');
    actionCell.className = 'border border-gray-300 px-4 py-2 text-center';
    const removeRowButton = document.createElement('button');
    removeRowButton.className = 'delete-row text-red-500 hover:text-red-700';
    removeRowButton.innerHTML = '<i class="fa fa-trash-o"></i>';
    removeRowButton.addEventListener('click', () => {
        // 删除对应的下拉框
        if (row._dropdown && row._dropdown.parentNode) {
            row._dropdown.parentNode.removeChild(row._dropdown);
        }
        tableBody.removeChild(row);
        updateRowIndexes(tableBody);
    });
    actionCell.appendChild(removeRowButton);
    row.appendChild(actionCell);

    // 移除原有的合计行
    const totalRow = tableBody.querySelector('.total-row');
    if (totalRow) {
        tableBody.removeChild(totalRow);
    }

    tableBody.appendChild(row);

    // 重新添加合计行
    updateTotalAmount(tableBody);
}

// 更新行序号
function updateRowIndexes(tableBody) {
    Array.from(tableBody.rows).forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// 绑定事件函数
function bindEvents(sectionId, tableBody) {
    const submitButtonId = sectionId === 'warehouseIn' ? 'submitWarehouseIn' : 'submitWarehouseOut';
    const submitButton = document.getElementById(submitButtonId);

    if (submitButton) {
        // 此处假设后续补充 handleFormSubmit 函数
        submitButton.addEventListener('click', (e) => handleFormSubmit(e, tableBody));
    }
}

function handleFormSubmit(e, tableBody) {
    e.preventDefault();
    if (!api.isAuthenticated) return;

    // 模块前缀判断
    const isIn = tableBody === inTableBody;
    const prefix = isIn ? 'in-' : 'out-';
    // 获取单据信息
    const dw = document.getElementById(isIn ? 'supplier' : 'customer')?.value;
    const orderNumber = document.getElementById(prefix + 'order-number')?.value;

    // 验证必填信息
    if (!orderNumber || !dw) {
        api.showNotification('错误', '请填写完整的单据信息', 'error');
        return;
    }

    // 收集表格数据
    const rows = tableBody.rows;
    const upData = [orderNumber, dw, []];

    for (let i = 0; i < rows.length; i++) {
        if (rows[i].classList.contains('total-row')) continue;

        const productName = rows[i].querySelector('input[placeholder="输入商品名称"]')?.value;
        const unit = rows[i].querySelector('input[placeholder="个/件"]')?.value;
        const quantity = parseFloat(rows[i].querySelector('.quantity')?.value) || 0;
        const amount = parseFloat(rows[i].querySelector('td:nth-child(6) input[type="number"]')?.value) || 0;

        // 验证商品信息
        if (productName) {
            if (!quantity || amount <= 0) {
                api.showNotification('错误', `第 ${i + 1} 行商品信息不完整或无效`, 'error');
                return;
            }
            upData[2].push([productName, unit, quantity, amount]);
        }
        // 商品名称为空视为清单结尾
        else {
            break;
        }
    }

    // 调用 API 提交数据
    api.updateRecord(upData).then(() => {
        // 复用 api 中的通知函数
        api.showNotification('成功', isIn ? '入库单提交成功' : '出库单提交成功', 'success');
        // 刷新数据
        api.fetchAllData();
        // 初始化表格而非清空表格
        initializeTableAfterSubmit(tableBody);
        document.getElementById(isIn ? 'supplier' : 'customer').value = '';
        
        // 生成并更新新单号
        const newDate = document.getElementById(prefix + 'date').value = new Date().toISOString().substring(0, 10);
        const orderNumberInput = document.getElementById(prefix + 'order-number');
        if (newDate && orderNumberInput) {
            orderNumberInput.value = generateUniqueOrderNumber(newDate, isIn ? 'warehouseIn' : 'warehouseOut');
        }
    }).catch(error => {
        console.error('提交失败:', error);
        api.showNotification('错误', isIn ? '入库单提交失败' : '出库单提交失败', 'error');
    });
}

// 初始化表格函数
function manageTableState(tableBody, shouldClearRows = false) {
    // 移除原有的合计行
    const totalRow = tableBody.querySelector('.total-row');
    if (totalRow) {
        tableBody.removeChild(totalRow);
    }

    if (shouldClearRows) {
        // 清空表格所有行
        tableBody.innerHTML = '';
    } else {
        // 清空所有行的数据，但保留表格结构
        const rows = tableBody.rows;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].classList.contains('total-row')) continue;
            const productInput = rows[i].querySelector('input[placeholder="输入商品名称"]');
            const unitInput = rows[i].querySelector('input[placeholder="个/件"]');
            const quantityInput = rows[i].querySelector('.quantity');
            const priceInput = rows[i].querySelector('.price');
            const amountInput = rows[i].querySelector('td:nth-child(6) input[type="number"]');

            if (productInput) productInput.value = '';
            if (unitInput) unitInput.value = '';
            if (quantityInput) quantityInput.value = '0';
            if (priceInput) priceInput.value = '0.00';
            if (amountInput) amountInput.value = '0.00';
        }
    }

    // 重新添加合计行
    updateTotalAmount(tableBody);
}

// 提交成功后初始化表格的函数
function initializeTableAfterSubmit(tableBody) {
    // 管理表格状态，不清空行结构，只清空数据
    manageTableState(tableBody, false);
}


// 添加计算表格合计金额的函数
function updateTotalAmount(tableBody) {
    // 检查 tableBody 是否存在
    if (!tableBody) return;

    let total = 0;
    const rows = tableBody.rows;

    for (let i = 0; i < rows.length; i++) {
        // 跳过合计行
        if (rows[i].classList.contains('total-row')) continue;

        // 使用准确的选择器获取金额输入框
        const input = rows[i].querySelector('td:nth-child(6) input[type="number"]');
        if (input) {
            const value = parseFloat(input.value);
            if (!isNaN(value)) {
                total += value;
            }
        }
    }

    // 查找或创建合计行
    let totalRow = tableBody.querySelector('.total-row');
    if (!totalRow) {
        totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        // 确保表格有行，避免 cells 为 undefined
        const colspan = tableBody.rows[0] ? tableBody.rows[0].cells.length - 1 : 0;
        totalRow.innerHTML = `
        <td colspan="${colspan}" class="text-right font-bold">合计:</td>
        <td class="font-bold">¥<span class="total-amount-value">0.00</span></td>
        `;
        tableBody.appendChild(totalRow);
    }

    // 更新合计金额
    const totalAmountSpan = totalRow.querySelector('.total-amount-value');
    if (totalAmountSpan) {
        totalAmountSpan.textContent = total.toFixed(2);
    }
}

// 生成唯一单号的函数，实现单号重复时自动递增
function generateUniqueOrderNumber(date, type) {
    const prefix = type === 'warehouseIn' ? 'RKD' : 'CKD';
    const dateStr = date.replace(/-/g, '');
    const base = prefix + dateStr;
    let i = 1;
    let dh;

    // 循环生成唯一单号
    do {
        dh = base + String(i++).padStart(3, '0');
    } while (api.crData.has(dh));

    // 返回正确的单号变量，而非字符串'dh'
    return dh;
}


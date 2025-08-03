/**
 * 商品查询模块
 */
import { api } from './api.js';
import defaultStatistics from './staticProductData.js';

// DOM元素
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const dataDisplay = document.getElementById('productListContainer');

// 全局数据
let allStatistics = [];
let filteredStatistics = [];

// 绑定事件处理程序
function bindEventHandlers() {
  // 搜索按钮点击事件
  searchButton.addEventListener('click', handleSearch);

  // 搜索输入框回车事件
  searchInput.addEventListener('keypress', (e) => {
    e.key === 'Enter' && handleSearch();
  });
}

// 获取全部数据
export default function () {
  // 统计商品信息
  if (!allStatistics.length) {
    allStatistics = defaultStatistics;
  } else {
    api.allProduct.forEach((info, name) => {
      allStatistics.push([name, info.unit, info.newPrice.toFixed(2), info.maxPrice.toFixed(2), info.minPrice.toFixed(2), info.avgPrice.toFixed(2)]);
    });
  }

  // 初始渲染数据
  filteredStatistics = allStatistics.slice(0, 50); // 显示最近50个商品
  renderData();
  api.showNotification('成功', '数据加载成功', 'success');
}

// 处理搜索
function handleSearch() {
  const searchTerm = searchInput.value.trim();

  // 使用拼音匹配搜索
  filteredStatistics = searchTerm ? allStatistics.filter(([spName]) =>
    window.PinyinMatch.match(spName, searchTerm)
  ) : [];

  renderData();
}

// 渲染数据
function renderData() {
  let resultCount = filteredStatistics.length;
  const productListContainer = document.getElementById('productListContainer');
  if (!productListContainer) {
    console.error('Element with ID "productListContainer" not found in DOM');
    return;
  }

  // 更新结果计数
  document.getElementById('resultCount').innerHTML = `找到 <span class="font-medium">${resultCount}</span> 个商品`;

  // 清空列表前添加加载状态
  dataDisplay.innerHTML = `
    <div class="text-center py-16 text-neutral-400">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
      <p>加载中...</p>
    </div>
  `;

  // 使用requestAnimationFrame优化渲染性能
  requestAnimationFrame(() => {
    // 获取左侧商品列表容器
    const productListContainer = document.getElementById('productListContainer');
    // 清空容器
    productListContainer.innerHTML = '';

    // 使用DocumentFragment减少DOM重绘
    const fragment = document.createDocumentFragment();

    // 添加数据行
    if (filteredStatistics && filteredStatistics.length) {
      filteredStatistics.forEach((item, index) => {
        const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-neutral-50';
        const productName = item[0];

        const div = document.createElement('div');
        div.className = `${bgClass} hover:bg-neutral-100 px-4 py-3 border-b cursor-pointer transition-colors`;
        div.setAttribute('data-product-name', productName);
        // 移除按钮相关HTML
        div.innerHTML = `
          <div class="text-sm font-medium text-neutral-700">${productName}</div>
        `;

        // 点击事件保留（仅用于显示详情）
        div.addEventListener('click', () => {
          showProductDetails(item);
          // 添加选中状态样式
          document.querySelectorAll('#productListContainer > div').forEach(el => {
            el.classList.remove('bg-primary/10', 'border-l-4', 'border-primary');
          });
          div.classList.add('bg-primary/10', 'border-l-4', 'border-primary');
        });

        fragment.appendChild(div);
      });
    } else {
      // 无数据状态
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'text-center py-16 text-neutral-400';
      emptyDiv.innerHTML = `
        <i class="fa fa-search text-3xl mb-2 block"></i>
        <p>${api.isAuthenticated ? '未找到匹配的商品' : '请先登陆'}</p>
      `;
      fragment.appendChild(emptyDiv);
    }

    productListContainer.appendChild(fragment);
  });
}

// 辅助函数：格式化日期
function formatDate(dateStr) {
  if (!dateStr || dateStr.length < 8) return dateStr;
  return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

// 出入库记录显示函数
function showProductDetails(productData) {
  const detailContainer = document.getElementById('productDetailContainer');
  const [productName, unit, latestPrice, highestPrice, lowestPrice, avgPrice] = productData;

  // 价格数据类型转换与安全处理
  const safeLatestPrice = Number(latestPrice) || 0;
  const safeHighestPrice = Number(highestPrice) || 0;
  const safeLowestPrice = Number(lowestPrice) || 0;
  const safeAvgPrice = Number(avgPrice) || 0;

  // 获取该商品的所有出入库记录
  const productRecords = api.allData.reduce((arr, record) => {
    const filtered = record.qd.reduce((map, item) => {
      if (item[0] === productName) {
        if (map.size) {
          map.set('quantity', map.get('quantity') + item[2]);
          map.set('amount', map.get('amount') + item[3]);
        } else {
          map.set('quantity', item[2]);
          map.set('amount', item[3]);
        }
      }
      return map;
    }, new Map());
    if (filtered.size) {
      arr.push({
        date: formatDate(record.dh.substring(3, 11)),
        dh: record.dh,
        type: record.dh.startsWith('RKD') ? '入库' : '出库',
        supplier: record.dh.startsWith('RKD') ? `供应商: ${record.dw}` : `客户: ${record.dw}`,
        quantity: filtered.get('quantity'),
        amount: filtered.get('amount') * 2,
      });
    }
    return arr;
  }, []);

  detailContainer.innerHTML = `
    <div class="p-4 border-b border-neutral-200">
      <h3 class="text-lg font-semibold text-neutral-800">${productName}</h3>
    </div>
    <div class="p-6 space-y-6">
      <!-- 价格详情区域 -->
      <div class="grid grid-cols-4 gap-4">
        <div class="bg-neutral-50 p-4 rounded-lg">
          <div class="text-sm text-neutral-500 mb-1">最新价</div>
          <div class="text-lg font-medium text-blue-600">¥${safeLatestPrice.toFixed(2)}</div>
        </div>
        <div class="bg-neutral-50 p-4 rounded-lg">
          <div class="text-sm text-neutral-500 mb-1">平均价</div>
          <div class="text-lg font-medium">¥${safeAvgPrice.toFixed(2)}</div>
        </div>
        <div class="bg-neutral-50 p-4 rounded-lg">
          <div class="text-sm text-neutral-500 mb-1">最高价</div>
          <div class="text-lg font-medium text-red-600">¥${safeHighestPrice.toFixed(2)}</div>
        </div>
        <div class="bg-neutral-50 p-4 rounded-lg">
          <div class="text-sm text-neutral-500 mb-1">最低价</div>
          <div class="text-lg font-medium text-green-600">¥${safeLowestPrice.toFixed(2)}</div>
        </div>
      </div>
      <!-- 出入库记录区域 -->
      <div class="pt-4 border-t border-neutral-200">
        <h4 class="text-base font-medium mb-3">出入库记录 (${productRecords.length})</h4>
        <div class="bg-neutral-50 rounded-lg p-3 space-y-2 max-h-[300px] overflow-y-auto">
          ${productRecords.length > 0 ? productRecords.map(record => `
            <div class="record-item p-2 border border-gray-200 rounded hover:bg-blue-50 cursor-pointer" data-dh="${record.dh}">
              <div class="flex justify-between items-center text-sm text-neutral-500">
                <span>${record.supplier}</span>
                <span>单号: ${record.dh}</span>
                <span>日期: ${record.date}</span>
              </div>
              <div class="flex justify-between items-center text-sm text-neutral-600">
                <span>${record.type}: ${record.quantity + unit}</span>
                <span>单价: ${(record.amount / record.quantity).toFixed(2)}</span>
                <span>金额: ${(record.amount).toFixed(2)}</span>
              </div>
            </div>
          `).join('') : '<div class="text-center text-neutral-400 py-4">暂无记录</div>'}
        </div>
      </div>
    </div>
  `;

}








// InOutBound.js
import { api } from './api.js';
import { initWarehouseIn, initWarehouseOut } from './inOrOut.js';
import initProductQuery from './productQuery.js';

// 存储各模块是否已初始化的状态
const initializedStates = {
    productQuery: false,
    warehouseIn: false,
    warehouseOut: false
};

// DOM元素
const dataDisplay = document.getElementById('dataDisplay');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const loginModal = document.getElementById('loginModal');
const modalContent = document.getElementById('modalContent');
const closeLoginModal = document.getElementById('closeLoginModal');
const loginForm = document.getElementById('loginForm');
const loginFormButton = loginForm.querySelector('button[type="submit"]');

// 绑定事件处理程序
function bindEventHandlers() {
  // 登录按钮
  loginButton.addEventListener('click', showLoginModal);

  // 登出按钮
  logoutButton.addEventListener('click', logout);

  // 关闭登录模态框
  closeLoginModal.addEventListener('click', hideLoginModal);

  // 登录表单提交
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    await handleLogin(username, password);
  });

  document.addEventListener('DOMContentLoaded', function () {
    const navLinks = document.querySelectorAll('nav a[data-target]');
    // 导航栏点击事件
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.target;
        switchSection(target);

        // 更新导航栏链接的激活状态
        navLinks.forEach(navLink => {
          if (navLink === link) {
            // 激活状态样式，统一类名
            navLink.classList.add('text-primary', 'border-b-2', 'border-primary', 'bg-primary/10', 'font-medium');
            navLink.classList.remove('text-neutral-700', 'border-transparent');
          } else {
            // 非激活状态样式，统一类名
            navLink.classList.remove('text-primary', 'border-b-2', 'border-primary', 'bg-primary/10', 'font-medium');
            navLink.classList.add('text-neutral-700', 'border-transparent');
          }
        });
      });
    });

    // 移动端菜单切换
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuButton && mobileMenu) {
      mobileMenuButton.addEventListener('click', function () {
        mobileMenu.classList.toggle('hidden');
      });

      // 点击移动端菜单项后关闭菜单
      mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function () {
          mobileMenu.classList.add('hidden');
        });
      });
    }

    // 默认显示商品查询页面，并确保其他部分被隐藏
    const defaultSection = document.getElementById('productQuery');
    const sections = document.querySelectorAll('main > section');

    // 先隐藏所有部分
    sections.forEach(section => {
      section.classList.add('hidden');
    });

    // 再显示默认部分
    if (defaultSection) {
      defaultSection.classList.remove('hidden');

      // 初始化默认部分
      if (defaultSection.id === 'productQuery') {
        initProductQuery();
      }
    }

    // 设置默认导航链接的激活状态
    const defaultNavLink = document.querySelector('nav a[data-target="productQuery"]');
    if (defaultNavLink) {
      defaultNavLink.classList.remove('text-neutral-700', 'border-transparent');
      // 统一激活状态样式
      defaultNavLink.classList.add('text-primary', 'border-b-2', 'border-primary', 'bg-primary/10', 'font-medium');
    }
    // 移动端菜单项点击事件，添加激活状态处理
    mobileMenu.querySelectorAll('a').forEach(link => { 
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const target = link.dataset.target;
        switchSection(target);
        
        // 更新移动端菜单项激活状态
        mobileMenu.querySelectorAll('a').forEach(mobileLink => {
          if (mobileLink === link) {
            mobileLink.classList.add('text-primary', 'bg-primary/10', 'font-medium');
            mobileLink.classList.remove('text-neutral-700');
          } else {
            mobileLink.classList.remove('text-primary', 'bg-primary/10', 'font-medium');
            mobileLink.classList.add('text-neutral-700');
          }
        });
      });
    });
  });
}

// 检查认证状态
function checkAuthentication() {
  if (api.isAuthenticated) {
    loginButton.classList.add('hidden');
    logoutButton.classList.remove('hidden');
  } else {
    loginButton.classList.remove('hidden');
    logoutButton.classList.add('hidden');
  }
}

// 初始化应用
async function initApp() {
    // 检查是否已登录
    checkAuthentication();

    // 绑定事件处理程序
    bindEventHandlers();

    // 显示欢迎信息
    api.showNotification('欢迎', '库存管理系统已就绪', 'info');

    // 每次打开页面都尝试获取最新数据，已在 fetchAllData 中实现版本对比
    if (api.isAuthenticated) {
        // 重新获取数据以初始化商品信息
        await api.fetchAllData();

        // 重新执行解析商品、客户和供应商数据的逻辑
        const productInfo = {};
        api.allData.forEach(v => {
            v.dh.slice(0, 3) == 'RKD' ? api.suppliers.set(v.dw, {}) : api.customers.set(v.dw, {})
            v.qd.forEach(([name, unit, quantity, amount]) => {
                if (!unit) unit = '-';
                const price = quantity ? amount / quantity : amount;
                if (!productInfo[name]) {
                    productInfo[name] = {
                        unit,
                        prices: [price],
                    };
                } else {
                    productInfo[name].prices.push(price);
                }
            });
        });

        const multiple = 2;
        for (const [name, info] of Object.entries(productInfo)) {
            const prices = [...new Set(info.prices)].filter(v => v);
            api.allProduct.set(name, {
                unit: info.unit,
                newPrice: info.prices[0] * multiple,
                maxPrice: Math.max(...prices) * multiple,
                minPrice: Math.min(...prices) * multiple,
                avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length * multiple,
            });
        }
    } else {
        // 若未登录，强制显示搜索页面
        const defaultSection = document.getElementById('productQuery');
        const sections = document.querySelectorAll('main > section');
        
        sections.forEach(section => {
            section.classList.add('hidden');
        });
        
        if (defaultSection) {
            defaultSection.classList.remove('hidden');
            initProductQuery();
        }
        
        // 设置默认导航链接的激活状态
        const defaultNavLink = document.querySelector('nav a[data-target="productQuery"]');
        if (defaultNavLink) {
            defaultNavLink.classList.remove('text-neutral-700', 'border-transparent');
            defaultNavLink.classList.add('text-primary', 'border-b-2', 'border-primary', 'bg-primary/10', 'font-medium');
        }

        // 仅在未登录时显示登录窗口
        // showLoginModal();
    }
}

// 显示登录模态框
function showLoginModal() {
  loginModal.classList.remove('hidden');
  // 添加动画
  setTimeout(() => {
    modalContent.classList.remove('scale-95', 'opacity-0');
    modalContent.classList.add('scale-100', 'opacity-100');
  }, 10);

  // 自动聚焦用户名输入框
  document.getElementById('username').focus();
}

// 隐藏登录模态框
function hideLoginModal() {
  modalContent.classList.remove('scale-100', 'opacity-100');
  modalContent.classList.add('scale-95', 'opacity-0');

  // 延迟隐藏模态框以完成动画
  setTimeout(() => {
    loginModal.classList.add('hidden');
  }, 300);
}

// 处理登录
async function handleLogin(username, password) {
  try {
    // 显示加载状态
    loginFormButton.disabled = true;
    loginFormButton.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i>登录中...';

    // 登录验证
    const success = await api.login(username, password);

    if (success) {
      // 隐藏登录模态框
      hideLoginModal();

      // 重置登录表单
      loginForm.reset();

      // 检查认证状态
      checkAuthentication();

      initProductQuery();
    } else {
      // 登录失败，显示错误信息
      api.showNotification('错误', '登录失败，请检查用户名和密码', 'error');
      loginFormButton.disabled = false;
      loginFormButton.innerHTML = '登录';
    }
  } catch (error) {
    // 登录过程中出现错误，显示错误信息
    api.showNotification('错误', '登录过程中出现错误，请稍后重试', 'error');
    loginFormButton.disabled = false;
    loginFormButton.innerHTML = '登录';
  }
}

// 处理登出
function logout() {
  api.logout();
  checkAuthentication();
  dataDisplay.innerHTML = `
    <div class="text-center py-16 text-neutral-400">
      <i class="fa fa-inbox text-5xl mb-4 block"></i>
      <p>请先登录</p>
    </div>
  `;
}

// 切换模块显示的函数
function switchSection(target) {
    const sections = ['productQuery', 'warehouseIn', 'warehouseOut'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (sectionId === target) {
            section.classList.remove('hidden');
            // 仅在首次切换时初始化模块
            if (!initializedStates[sectionId]) {
                if (sectionId === 'productQuery') {
                    initProductQuery();
                } else if (sectionId === 'warehouseIn') {
                    initWarehouseIn();
                } else if (sectionId === 'warehouseOut') {
                    initWarehouseOut();
                }
                initializedStates[sectionId] = true;
            }
        } else {
            section.classList.add('hidden');
        }
    });
}

initApp();

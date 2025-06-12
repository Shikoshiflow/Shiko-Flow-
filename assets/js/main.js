// Дождаться полной загрузки документа
document.addEventListener('DOMContentLoaded', function() {
    // Прелоадер
    setTimeout(function() {
        const preloader = document.querySelector('.preloader');
        preloader.classList.add('hidden');
    }, 1500);

    // Мобильное меню
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    navToggle.addEventListener('click', function() {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Закрытие мобильного меню при клике на ссылку
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Изменение хедера при скролле
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Активная ссылка навигации при скролле
    const sections = document.querySelectorAll('section');
    
    window.addEventListener('scroll', function() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // Фильтрация портфолио
    const filterBtns = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    // Сразу показываем все элементы портфолио при загрузке
    portfolioItems.forEach(item => {
        item.style.display = 'block';
    });
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Активная кнопка
            filterBtns.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Фильтрация
            const filter = this.getAttribute('data-filter');
            
            portfolioItems.forEach(item => {
                if (filter === 'all' || item.getAttribute('data-category') === filter) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Анимация при скролле
    const fadeElements = document.querySelectorAll('.fade-in');
    const slideLeftElements = document.querySelectorAll('.slide-in-left');
    const slideRightElements = document.querySelectorAll('.slide-in-right');
    const zoomElements = document.querySelectorAll('.zoom-in');
    
    // Добавляем классы к элементам для анимации
    document.querySelector('.hero-text').classList.add('slide-in-left');
    document.querySelector('.hero-visual').classList.add('slide-in-right');
    
    document.querySelector('.about-text').classList.add('slide-in-left');
    document.querySelector('.skills').classList.add('slide-in-right');
    
    document.querySelectorAll('.portfolio-item').forEach(item => {
        item.classList.add('fade-in');
    });
    
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.classList.add('fade-in');
    });
    
    document.querySelector('.contact-info').classList.add('slide-in-left');
    document.querySelector('.contact-form-container').classList.add('slide-in-right');
    
    // Функция для проверки элементов в viewport
    function checkElements() {
        const triggerBottom = window.innerHeight * 0.9; // Увеличиваем триггер для лучшей видимости
        
        function checkElement(element) {
            const elementTop = element.getBoundingClientRect().top;
            
            if (elementTop < triggerBottom) {
                element.classList.add('active');
            }
        }
        
        // Принудительно добавляем класс active для карточек портфолио
        document.querySelectorAll('.portfolio-item').forEach(item => {
            item.classList.add('active');
        });
        
        fadeElements.forEach(checkElement);
        slideLeftElements.forEach(checkElement);
        slideRightElements.forEach(checkElement);
        zoomElements.forEach(checkElement);
    }
    
    // Запускаем проверку при загрузке и скролле
    window.addEventListener('scroll', checkElements);
    
    // Запускаем проверку сразу и с небольшой задержкой для надежности
    checkElements();
    setTimeout(checkElements, 500);
    
    // Отправка формы контактов
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const subjectInput = document.getElementById('subject');
            const messageInput = document.getElementById('message');
            
            // Здесь можно добавить код для отправки формы на сервер
            // Либо через fetch API, либо через другой метод
            
            // Симуляция отправки
            alert(`Сообщение отправлено!
Имя: ${nameInput.value}
Email: ${emailInput.value}
Тема: ${subjectInput.value}
Сообщение: ${messageInput.value}`);
            
            // Очистка формы
            contactForm.reset();
        });
    }

    // Плавный скролл к якорям
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 70,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Параллакс эффект для элементов фона
    window.addEventListener('mousemove', function(e) {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        const heroShapes = document.querySelectorAll('.hero-bg .shape');
        heroShapes.forEach(shape => {
            const shiftValue = 30;
            shape.style.transform = `translate(${mouseX * shiftValue}px, ${mouseY * shiftValue}px)`;
        });
        
        const floatingElements = document.querySelectorAll('.floating-element');
        floatingElements.forEach(element => {
            const shiftValue = 20;
            const currentTransform = element.style.transform || '';
            // Сохраняем анимацию float и добавляем параллакс
            if (!currentTransform.includes('translate')) {
                element.style.transform = `translate(${mouseX * shiftValue}px, ${mouseY * shiftValue}px)`;
            }
        });
    });

    // Инициализация фонов и градиентов
    const gradients = document.querySelectorAll('.hero-gradient, .about-gradient, .portfolio-gradient, .future-gradient, .contact-gradient');
    gradients.forEach(gradient => {
        gradient.style.opacity = '0.7'; // Убеждаемся, что градиенты видны
    });
});
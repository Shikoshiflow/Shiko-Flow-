const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

// Создаем приложение Express
const app = express();
const PORT = 3000;

// Промежуточное ПО для обработки JSON и формы
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Отключаем кэширование для всех запросов
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '-1');
  next();
});

// Обслуживание статических файлов
app.use(express.static(__dirname, {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');
  }
}));

// Обеспечиваем доступ к админ-панели
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Убедимся, что директория data существует
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
  console.log('Создана директория data');
}

// Отладочный маршрут для анализа HTML-структуры
app.get('/debug', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Извлекаем HTML блока портфолио для анализа
    const portfolioSection = htmlContent.match(/<section id="portfolio"[\s\S]*?<\/section>/);
    
    if (portfolioSection) {
      res.send(`
        <h1>Отладка HTML-структуры</h1>
        <h2>Блок портфолио</h2>
        <pre style="background:#f5f5f5; padding:15px; overflow:auto; max-height:500px;">${portfolioSection[0].replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        <a href="/extract-portfolio" style="padding:10px 20px; background:#7928CA; color:white; text-decoration:none; display:inline-block; margin-top:20px; border-radius:5px;">Попробовать извлечь данные портфолио</a>
      `);
    } else {
      res.send('Не удалось найти блок портфолио');
    }
  } catch (error) {
    res.status(500).send('Ошибка: ' + error.message);
  }
});

// Маршрут для ручного извлечения данных портфолио
app.get('/extract-portfolio', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Извлекаем всю секцию портфолио
    const portfolioSection = htmlContent.match(/<section id="portfolio"[\s\S]*?<\/section>/);
    
    if (!portfolioSection) {
      return res.json({ error: 'Не удалось найти секцию портфолио' });
    }
    
    // Ищем внутри все портфолио-элементы
    const portfolioItems = [];
    const itemRegex = /<div class="portfolio-item"[^>]*data-category="([^"]*)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
    
    let match;
    while ((match = itemRegex.exec(portfolioSection[0])) !== null) {
      const category = match[1];
      const itemHtml = match[2];
      
      // Извлекаем данные элемента
      const titleMatch = itemHtml.match(/<h3 class="portfolio-title">([\s\S]*?)<\/h3>/);
      const descMatch = itemHtml.match(/<p class="portfolio-description">([\s\S]*?)<\/p>/);
      const imgMatch = itemHtml.match(/<img src="([^"]*?)"/);
      
      // Извлекаем данные из hover-блока
      const hoverMatch = itemHtml.match(/<div class="portfolio-hover">([\s\S]*?)<\/div>/);
      let longDescription = '';
      let link = '#';
      
      if (hoverMatch) {
        const hoverHtml = hoverMatch[1];
        const hoverDescMatch = hoverHtml.match(/<p>([\s\S]*?)<\/p>/);
        const linkMatch = hoverHtml.match(/<a href="([^"]*?)"/);
        
        longDescription = hoverDescMatch ? hoverDescMatch[1] : '';
        link = linkMatch ? linkMatch[1] : '#';
      }
      
      // Извлекаем теги
      const tags = [];
      const tagsRegex = /<span class="tag">([\s\S]*?)<\/span>/g;
      let tagMatch;
      while ((tagMatch = tagsRegex.exec(itemHtml)) !== null) {
        tags.push(tagMatch[1]);
      }
      
      portfolioItems.push({
        title: titleMatch ? titleMatch[1] : '',
        category,
        description: descMatch ? descMatch[1] : '',
        longDescription,
        image: imgMatch ? imgMatch[1] : '',
        link,
        tags
      });
    }
    
    // Сохраняем данные в файл
    const portfolioPath = path.join(__dirname, 'data', 'portfolio.json');
    fs.writeFileSync(portfolioPath, JSON.stringify({ items: portfolioItems }, null, 2), 'utf8');
    
    res.json({
      success: true,
      message: `Извлечено ${portfolioItems.length} элементов портфолио`,
      items: portfolioItems
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получение данных из JSON-файла
app.get('/api/:section', (req, res) => {
  const section = req.params.section;
  const filePath = path.join(__dirname, 'data', `${section}.json`);
  
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
        console.log(`Данные из ${section}.json успешно отправлены клиенту`);
      } catch (e) {
        console.error(`Ошибка парсинга JSON из ${section}.json:`, e);
        res.status(500).json({ error: 'Ошибка при чтении данных из файла' });
      }
    } else {
      console.warn(`Файл ${section}.json не найден`);
      res.status(404).json({ error: 'Файл не найден' });
    }
  } catch (error) {
    console.error(`Ошибка при чтении ${section}.json:`, error);
    res.status(500).json({ error: 'Ошибка при чтении файла' });
  }
});

// Обработка запроса на сохранение данных
app.post('/api/:section', (req, res) => {
  const section = req.params.section;
  const filePath = path.join(__dirname, 'data', `${section}.json`);
  
  try {
    // Создаем резервную копию текущего файла
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, `${filePath}.bak`);
      console.log(`Создана резервная копия ${section}.json`);
    }
    
    // Сохраняем новые данные
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf8');
    console.log(`Данные успешно сохранены в ${section}.json`);
    
    // Создаем резервную копию HTML перед обновлением
    const htmlPath = path.join(__dirname, 'index.html');
    fs.copyFileSync(htmlPath, `${htmlPath}.bak`);
    console.log('Создана резервная копия index.html');
    
    // Обновляем HTML
    const result = updateHtml();
    
    if (result.success) {
      res.json({ success: true });
    } else {
      // Восстанавливаем из резервной копии, если обновление не удалось
      fs.copyFileSync(`${filePath}.bak`, filePath);
      fs.copyFileSync(`${htmlPath}.bak`, htmlPath);
      console.error('Ошибка при обновлении HTML, восстановлены резервные копии');
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Ошибка при сохранении данных:', error);
    res.status(500).json({ error: error.message });
  }
});

// Функция безопасной замены части HTML
function safeReplaceInHtml(html, pattern, replacement) {
  try {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      const fullMatch = matches[0];
      const startIndex = html.indexOf(fullMatch);
      
      if (startIndex !== -1) {
        return html.substring(0, startIndex) + replacement + html.substring(startIndex + fullMatch.length);
      }
    }
    return null;
  } catch (error) {
    console.error('Ошибка при замене HTML:', error);
    return null;
  }
}

// Функция для обновления HTML-файла на основе данных из JSON
function updateHtml() {
  console.log('Начинаем обновление HTML...');
  try {
    const htmlPath = path.join(__dirname, 'index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    let isUpdated = false;
    
    // Обновление раздела "О себе"
    try {
      const aboutPath = path.join(__dirname, 'data', 'about.json');
      if (fs.existsSync(aboutPath)) {
        console.log('Обновление раздела "О себе"...');
        const aboutData = JSON.parse(fs.readFileSync(aboutPath, 'utf8'));
        
        if (aboutData.text1 && aboutData.text2) {
          const aboutPattern = /<div class="about-text">([\s\S]*?)<\/div>\s*<div class="skills"/;
          const replacement = `<div class="about-text">
                    <p>${aboutData.text1}</p>
                    <p>${aboutData.text2}</p>
                </div>
                <div class="skills"`;
          
          const updatedHtml = safeReplaceInHtml(htmlContent, aboutPattern, replacement);
          if (updatedHtml) {
            htmlContent = updatedHtml;
            isUpdated = true;
            console.log('Раздел "О себе" успешно обновлен');
          } else {
            console.error('Не удалось найти блок about-text в HTML');
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при обновлении раздела "О себе":', error);
    }
    
    // Обновление раздела будущих проектов
    try {
      const futurePath = path.join(__dirname, 'data', 'future.json');
      if (fs.existsSync(futurePath)) {
        console.log('Обновление раздела будущих проектов...');
        const futureData = JSON.parse(fs.readFileSync(futurePath, 'utf8'));
        
        if (futureData.items && futureData.items.length > 0) {
          let timelineHtml = '';
          
          futureData.items.forEach(item => {
            timelineHtml += `
                <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-date">${item.date || ''}</div>
                        <h3 class="timeline-title">${item.title || ''}</h3>
                        <p class="timeline-description">${item.description || ''}</p>
                    </div>
                </div>`;
          });
          
          const timelinePattern = /<div class="timeline">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="future-bg">/;
          const replacement = `<div class="timeline">${timelineHtml}
            </div>
        </div>
        <div class="future-bg">`;
          
          const updatedHtml = safeReplaceInHtml(htmlContent, timelinePattern, replacement);
          if (updatedHtml) {
            htmlContent = updatedHtml;
            isUpdated = true;
            console.log('Раздел будущих проектов успешно обновлен');
          } else {
            console.error('Не удалось найти блок timeline в HTML');
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при обновлении раздела будущих проектов:', error);
    }
    
    // Обновление контактной информации
    try {
      const contactPath = path.join(__dirname, 'data', 'contact.json');
      if (fs.existsSync(contactPath)) {
        console.log('Обновление контактной информации...');
        const contactData = JSON.parse(fs.readFileSync(contactPath, 'utf8'));
        
        if (contactData) {
          let updated = false;
          
          // Обновляем Email
          if (contactData.email) {
            const emailPattern = /<h3>Email<\/h3>\s*<p>([^<]*)<\/p>/;
            const emailReplacement = `<h3>Email</h3>
                            <p>${contactData.email}</p>`;
            
            const updatedHtml = safeReplaceInHtml(htmlContent, emailPattern, emailReplacement);
            if (updatedHtml) {
              htmlContent = updatedHtml;
              updated = true;
              console.log('Email успешно обновлен');
            }
          }
          
          // Обновляем телефон
          if (contactData.phone) {
            const phonePattern = /<h3>Телефон<\/h3>\s*<p>([^<]*)<\/p>/;
            const phoneReplacement = `<h3>Телефон</h3>
                            <p>${contactData.phone}</p>`;
            
            const updatedHtml = safeReplaceInHtml(htmlContent, phonePattern, phoneReplacement);
            if (updatedHtml) {
              htmlContent = updatedHtml;
              updated = true;
              console.log('Телефон успешно обновлен');
            }
          }
          
          // Обновляем адрес
          if (contactData.address) {
            const addressPattern = /<h3>Адрес<\/h3>\s*<p>([^<]*)<\/p>/;
            const addressReplacement = `<h3>Адрес</h3>
                            <p>${contactData.address}</p>`;
            
            const updatedHtml = safeReplaceInHtml(htmlContent, addressPattern, addressReplacement);
            if (updatedHtml) {
              htmlContent = updatedHtml;
              updated = true;
              console.log('Адрес успешно обновлен');
            }
          }
          
          isUpdated = isUpdated || updated;
        }
      }
    } catch (error) {
      console.error('Ошибка при обновлении контактной информации:', error);
    }
    
    if (isUpdated) {
      // Сохраняем обновленный HTML
      fs.writeFileSync(htmlPath, htmlContent, 'utf8');
      console.log('HTML успешно обновлен');
      return { success: true };
    } else {
      console.warn('Не было произведено никаких изменений в HTML');
      return { success: false, error: 'Не было произведено изменений' };
    }
  } catch (error) {
    console.error('Ошибка при обновлении HTML:', error);
    return { success: false, error: error.message };
  }
}

// Инициализация данных из существующего HTML при первом запуске
function initializeDataFromHtml() {
  console.log('Начинаем извлечение данных из HTML...');
  try {
    const htmlPath = path.join(__dirname, 'index.html');
    if (!fs.existsSync(htmlPath)) {
      console.error('Файл index.html не найден!');
      return;
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Извлечение данных портфолио
    try {
      console.log('Извлечение данных портфолио...');
      const portfolioPath = path.join(__dirname, 'data', 'portfolio.json');
      
      if (fs.existsSync(portfolioPath)) {
        console.log('Файл portfolio.json уже существует, пропускаем создание');
      } else {
        // Извлекаем всю секцию портфолио
        const portfolioSection = htmlContent.match(/<section id="portfolio"[\s\S]*?<\/section>/);
        
        if (portfolioSection) {
          console.log('Найдена секция портфолио');
          
          // Ищем все портфолио-элементы
          const itemRegex = /<div class="portfolio-item"[^>]*data-category="([^"]*)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
          const portfolioItems = [];
          
          let match;
          while ((match = itemRegex.exec(portfolioSection[0])) !== null) {
            const category = match[1];
            const itemHtml = match[2];
            
            // Извлекаем данные элемента
            const titleMatch = itemHtml.match(/<h3 class="portfolio-title">([\s\S]*?)<\/h3>/);
            const descMatch = itemHtml.match(/<p class="portfolio-description">([\s\S]*?)<\/p>/);
            const imgMatch = itemHtml.match(/<img src="([^"]*?)"/);
            
            // Извлекаем данные из hover-блока
            const hoverMatch = itemHtml.match(/<div class="portfolio-hover">([\s\S]*?)<\/div>/);
            let longDescription = '';
            let link = '#';
            
            if (hoverMatch) {
              const hoverHtml = hoverMatch[1];
              const hoverDescMatch = hoverHtml.match(/<p>([\s\S]*?)<\/p>/);
              const linkMatch = hoverHtml.match(/<a href="([^"]*?)"/);
              
              longDescription = hoverDescMatch ? hoverDescMatch[1] : '';
              link = linkMatch ? linkMatch[1] : '#';
            }
            
            // Извлекаем теги
            const tags = [];
            const tagsRegex = /<span class="tag">([\s\S]*?)<\/span>/g;
            let tagMatch;
            while ((tagMatch = tagsRegex.exec(itemHtml)) !== null) {
              tags.push(tagMatch[1]);
            }
            
            const title = titleMatch ? titleMatch[1] : '';
            const description = descMatch ? descMatch[1] : '';
            const image = imgMatch ? imgMatch[1] : '';
            
            portfolioItems.push({
              title,
              category,
              description,
              longDescription,
              image,
              link,
              tags
            });
            
            console.log(`Извлечен проект: ${title} (${category})`);
          }
          
          if (portfolioItems.length > 0) {
            fs.writeFileSync(
              portfolioPath, 
              JSON.stringify({ items: portfolioItems }, null, 2), 
              'utf8'
            );
            console.log(`Найдено и сохранено ${portfolioItems.length} проектов в portfolio.json`);
          } else {
            console.warn('Не удалось найти элементы портфолио');
            fs.writeFileSync(portfolioPath, JSON.stringify({ items: [] }, null, 2), 'utf8');
          }
        } else {
          console.warn('Не удалось найти секцию портфолио');
          fs.writeFileSync(portfolioPath, JSON.stringify({ items: [] }, null, 2), 'utf8');
        }
      }
    } catch (error) {
      console.error('Ошибка при извлечении данных портфолио:', error);
    }
    
    // Извлечение данных "О себе"
    try {
      console.log('Извлечение данных из раздела "О себе"...');
      const aboutPath = path.join(__dirname, 'data', 'about.json');
      
      if (fs.existsSync(aboutPath)) {
        console.log('Файл about.json уже существует, пропускаем создание');
      } else {
        const aboutRegex = /<div class="about-text">([\s\S]*?)<\/div>\s*<div class="skills"/;
        const aboutMatch = htmlContent.match(aboutRegex);
        
        if (aboutMatch && aboutMatch[1]) {
          const aboutHtml = aboutMatch[1];
          const paragraphRegex = /<p>(.*?)<\/p>/g;
          
          const paragraphs = [];
          let match;
          while ((match = paragraphRegex.exec(aboutHtml)) !== null) {
            paragraphs.push(match[1]);
          }
          
          if (paragraphs.length >= 2) {
            fs.writeFileSync(
              aboutPath,
              JSON.stringify({
                text1: paragraphs[0] || '',
                text2: paragraphs[1] || ''
              }, null, 2),
              'utf8'
            );
            console.log('Данные "О себе" успешно сохранены в about.json');
          } else {
            console.warn('Не удалось найти параграфы в разделе "О себе"');
            fs.writeFileSync(
              aboutPath,
              JSON.stringify({
                text1: '',
                text2: ''
              }, null, 2),
              'utf8'
            );
          }
        } else {
          console.warn('Не удалось найти блок about-text в HTML');
          fs.writeFileSync(
            aboutPath,
            JSON.stringify({
              text1: '',
              text2: ''
            }, null, 2),
            'utf8'
          );
        }
      }
    } catch (error) {
      console.error('Ошибка при извлечении данных из раздела "О себе":', error);
    }
    
    // Извлечение данных будущих проектов
    try {
      console.log('Извлечение данных будущих проектов...');
      const futurePath = path.join(__dirname, 'data', 'future.json');
      
      if (fs.existsSync(futurePath)) {
        console.log('Файл future.json уже существует, пропускаем создание');
      } else {
        const timelineRegex = /<div class="timeline">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="future-bg">/;
        const timelineMatch = htmlContent.match(timelineRegex);
        
        if (timelineMatch && timelineMatch[1]) {
          const timelineHtml = timelineMatch[1];
          const itemRegex = /<div class="timeline-item">([\s\S]*?)(?=<div class="timeline-item"|<\/div>\s*<\/div>\s*<div class="future-bg">)/g;
          
          const futureItems = [];
          let match;
          while ((match = itemRegex.exec(timelineHtml)) !== null) {
            const itemHtml = match[1];
            
            const dateMatch = itemHtml.match(/<div class="timeline-date">(.*?)<\/div>/);
            const titleMatch = itemHtml.match(/<h3 class="timeline-title">(.*?)<\/h3>/);
            const descMatch = itemHtml.match(/<p class="timeline-description">(.*?)<\/p>/);
            
            const date = dateMatch ? dateMatch[1] : '';
            const title = titleMatch ? titleMatch[1] : '';
            const description = descMatch ? descMatch[1] : '';
            
            futureItems.push({
              date,
              title,
              description
            });
            
            console.log(`Извлечен будущий проект: ${title} (${date})`);
          }
          
          if (futureItems.length > 0) {
            fs.writeFileSync(
              futurePath,
              JSON.stringify({ items: futureItems }, null, 2),
              'utf8'
            );
            console.log(`Найдено и сохранено ${futureItems.length} будущих проектов в future.json`);
          } else {
            console.warn('Не удалось найти элементы timeline в HTML');
            fs.writeFileSync(futurePath, JSON.stringify({ items: [] }, null, 2), 'utf8');
          }
        } else {
          console.warn('Не удалось найти блок timeline в HTML');
          fs.writeFileSync(futurePath, JSON.stringify({ items: [] }, null, 2), 'utf8');
        }
      }
    } catch (error) {
      console.error('Ошибка при извлечении данных будущих проектов:', error);
    }
    
    // Извлечение контактной информации
    try {
      console.log('Извлечение контактной информации...');
      const contactPath = path.join(__dirname, 'data', 'contact.json');
      
      if (fs.existsSync(contactPath)) {
        console.log('Файл contact.json уже существует, пропускаем создание');
      } else {
        const contactData = {};
        
        // Извлекаем email
        const emailMatch = htmlContent.match(/<h3>Email<\/h3>\s*<p>(.*?)<\/p>/);
        if (emailMatch) {
          contactData.email = emailMatch[1];
          console.log(`Найден email: ${contactData.email}`);
        }
        
        // Извлекаем телефон
        const phoneMatch = htmlContent.match(/<h3>Телефон<\/h3>\s*<p>(.*?)<\/p>/);
        if (phoneMatch) {
          contactData.phone = phoneMatch[1];
          console.log(`Найден телефон: ${contactData.phone}`);
        }
        
        // Извлекаем адрес
        const addressMatch = htmlContent.match(/<h3>Адрес<\/h3>\s*<p>(.*?)<\/p>/);
        if (addressMatch) {
          contactData.address = addressMatch[1];
          console.log(`Найден адрес: ${contactData.address}`);
        }
        
        // Извлекаем социальные сети
        const socialLinksMatch = htmlContent.match(/<div class="social-links">([\s\S]*?)<\/div>/);
        if (socialLinksMatch) {
          const socialHtml = socialLinksMatch[1];
          const linkRegex = /<a href="([^"]*?)"/g;
          
          const links = [];
          let match;
          while ((match = linkRegex.exec(socialHtml)) !== null) {
            links.push(match[1]);
          }
          
          contactData.social = {
            linkedin: links[0] || '#',
            twitter: links[1] || '#',
            instagram: links[2] || '#',
            facebook: links[3] || '#'
          };
          
          console.log('Найдены ссылки на социальные сети');
        }
        
        fs.writeFileSync(
          contactPath,
          JSON.stringify(contactData, null, 2),
          'utf8'
        );
        console.log('Контактные данные сохранены в contact.json');
      }
    } catch (error) {
      console.error('Ошибка при извлечении контактной информации:', error);
    }
    
    console.log('Инициализация данных из HTML завершена');
  } catch (error) {
    console.error('Ошибка при инициализации данных:', error);
  }
}

// Маршрут для принудительного обновления HTML
app.get('/update-html', (req, res) => {
  try {
    const result = updateHtml();
    
    if (result.success) {
      res.json({ success: true, message: 'HTML успешно обновлен' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Маршрут для пересоздания файлов данных из HTML
app.get('/reinitialize', (req, res) => {
  try {
    // Удаляем существующие файлы данных
    const dataDir = path.join(__dirname, 'data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(dataDir, file));
          console.log(`Удален файл: ${file}`);
        }
      });
    }
    
    // Заново извлекаем данные
    initializeDataFromHtml();
    
    res.json({ success: true, message: 'Данные успешно переинициализированы' });
  } catch (error) {
    console.error('Ошибка при переинициализации данных:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Маршрут для сброса изменений
app.get('/restore', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(`${htmlPath}.bak`)) {
      fs.copyFileSync(`${htmlPath}.bak`, htmlPath);
      console.log('HTML восстановлен из резервной копии');
      res.json({ success: true, message: 'HTML восстановлен из резервной копии' });
    } else {
      res.status(404).json({ error: 'Резервная копия не найдена' });
    }
  } catch (error) {
    console.error('Ошибка при восстановлении из резервной копии:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Маршрут для создания готовых данных вручную
app.get('/create-demo-data', (req, res) => {
  try {
    // Создаем директорию data, если её нет
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    // Готовые данные портфолио
    const portfolioData = {
      items: [
        {
          title: "AI-генерация изображений",
          category: "image",
          description: "Серия уникальных изображений, созданных с помощью нейросетей",
          longDescription: "Проект по созданию уникального визуального контента с помощью нейросетей.",
          image: "assets/img/icons/placeholder-image.svg",
          link: "#",
          tags: ["AI", "Искусство", "Дизайн"]
        },
        {
          title: "AI-генерация видео",
          category: "video",
          description: "Коллекция видеороликов, созданных с помощью AI-технологий",
          longDescription: "Проект по созданию динамического контента с использованием современных технологий.",
          image: "assets/img/icons/placeholder-video.svg",
          link: "#",
          tags: ["Video", "Motion", "AI"]
        },
        {
          title: "Современный веб-сайт",
          category: "web",
          description: "Разработка креативного веб-сайта с уникальным дизайном",
          longDescription: "Проект по созданию уникального веб-сайта с использованием современных технологий.",
          image: "assets/img/icons/placeholder-web.svg",
          link: "#",
          tags: ["HTML", "CSS", "JavaScript"]
        },
        {
          title: "Мобильное приложение",
          category: "app",
          description: "Разработка функционального приложения для iOS и Android",
          longDescription: "Проект по созданию кроссплатформенного мобильного приложения.",
          image: "assets/img/icons/placeholder-app.svg",
          link: "#",
          tags: ["React Native", "UI/UX", "Mobile"]
        },
        {
          title: "Веб-приложение",
          category: "web",
          description: "Интерактивное веб-приложение с богатым функционалом",
          longDescription: "Проект по созданию полнофункционального веб-приложения на современном стеке технологий.",
          image: "assets/img/icons/placeholder-web.svg",
          link: "#",
          tags: ["React", "Node.js", "MongoDB"]
        },
        {
          title: "3D визуализация",
          category: "image",
          description: "Создание трёхмерных моделей и визуализаций",
          longDescription: "Проект по созданию фотореалистичных 3D визуализаций и моделей.",
          image: "assets/img/icons/placeholder-image.svg",
          link: "#",
          tags: ["3D", "Blender", "Рендеринг"]
        }
      ]
    };
    
    // Данные о себе
    const aboutData = {
      text1: "Я специалист в области цифрового творчества и технологий. Моя страсть — создавать уникальные проекты, объединяющие искусство и инновации.",
      text2: "Работая с различными инструментами и технологиями, я стремлюсь воплощать креативные идеи и решать нестандартные задачи."
    };
    
    // Данные будущих проектов
    const futureData = {
      items: [
        {
          date: "Q2 2025",
          title: "Исследование генеративного искусства",
          description: "Создание серии художественных работ на основе алгоритмических процессов и машинного обучения."
        },
        {
          date: "Q3 2025",
          title: "Интерактивная платформа для визуализации данных",
          description: "Разработка веб-платформы для создания красивых и информативных визуализаций на основе пользовательских данных."
        },
        {
          date: "Q4 2025",
          title: "AI-ассистент для творческих профессий",
          description: "Создание приложения, использующего искусственный интеллект для помощи дизайнерам, художникам и креативщикам."
        },
        {
          date: "Q1 2026",
          title: "Иммерсивная VR-галерея",
          description: "Создание виртуального пространства для демонстрации цифрового искусства в формате виртуальной реальности."
        }
      ]
    };
    
    // Контактные данные
    const contactData = {
      email: "hello@example.com",
      phone: "+7 (999) 123-45-67",
      address: "Москва, Россия",
      social: {
        linkedin: "#",
        twitter: "#",
        instagram: "#",
        facebook: "#"
      }
    };
    
    // Сохраняем данные в файлы
    fs.writeFileSync(path.join(dataDir, 'portfolio.json'), JSON.stringify(portfolioData, null, 2), 'utf8');
    fs.writeFileSync(path.join(dataDir, 'about.json'), JSON.stringify(aboutData, null, 2), 'utf8');
    fs.writeFileSync(path.join(dataDir, 'future.json'), JSON.stringify(futureData, null, 2), 'utf8');
    fs.writeFileSync(path.join(dataDir, 'contact.json'), JSON.stringify(contactData, null, 2), 'utf8');
    
    // Обновляем HTML на основе готовых данных
    updateHtml();
    
    res.json({ 
      success: true, 
      message: 'Демонстрационные данные созданы успешно',
      data: {
        portfolio: portfolioData,
        about: aboutData,
        future: futureData,
        contact: contactData
      }
    });
  } catch (error) {
    console.error('Ошибка при создании демонстрационных данных:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Проверяем наличие JSON-файлов и создаем их, если необходимо
const dataFiles = ['portfolio.json', 'about.json', 'future.json', 'contact.json'];
let needsInit = false;

for (const file of dataFiles) {
  const filePath = path.join(__dirname, 'data', file);
  if (!fs.existsSync(filePath)) {
    needsInit = true;
    break;
  }
}

if (needsInit) {
  console.log('Файлы данных не найдены, начинаем инициализацию...');
  initializeDataFromHtml();
} else {
  console.log('Все файлы данных уже существуют, пропускаем инициализацию');
}

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`Админ-панель доступна по адресу http://localhost:${PORT}/admin`);
  console.log(`Для обновления HTML перейдите на http://localhost:${PORT}/update-html`);
  console.log(`Для переинициализации данных перейдите на http://localhost:${PORT}/reinitialize`);
  console.log(`Для восстановления HTML из резервной копии перейдите на http://localhost:${PORT}/restore`);
  console.log(`Для создания демо-данных перейдите на http://localhost:${PORT}/create-demo-data`);
});
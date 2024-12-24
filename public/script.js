class ThemeManager {
  constructor() {
    this.themeCheckbox = document.getElementById("theme-checkbox");
    this.init();
   }

  init() {
    // Загружаем сохраненную тему
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      this.themeCheckbox.checked = true;
    }

    // Добавляем обработчик изменения темы
    this.themeCheckbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
        this.addRippleEffect(e);
      } else {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("theme", "light");
        this.addRippleEffect(e);
      }
    });
  }

  addRippleEffect(e) {
    const ripple = document.createElement("div");
    ripple.classList.add("theme-ripple");
    document.body.appendChild(ripple);

    const rect = this.themeCheckbox.getBoundingClientRect();
    const size = Math.max(window.innerWidth, window.innerHeight) * 2;

    ripple.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${e.clientX - size / 2}px;
            top: ${e.clientY - size / 2}px;
        `;

    ripple.classList.add("ripple-animate");

    setTimeout(() => ripple.remove(), 1000);
  }
}

class WeatherService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.cities = [
      "Омск",
      "Усть-Ишим",
      "Тара",
      "Тюкалинск",
      "Большеречье",
      "Называевск",
      "Тевриз",
      "Саргатское",
      "Исилькуль",
      "Калачинск",
      "Полтавка",
      "Русская Поляна",
      "Черлак",
      "Одесское",
      "Павлоградка",
    ];
  }

  async getWeatherData(city, dates) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city},ru&units=metric&lang=ru&appid=${this.apiKey}`,
      );
      const data = await response.json();

      if (data.cod !== "200") {
        throw new Error(data.message);
      }

      return this.formatWeatherData(data, city, dates);
    } catch (error) {
      console.error(`Ошибка получения данных для ${city}:`, error);
      throw error;
    }
  }

  formatWeatherData(data, city, dates) {
    let formattedData = { city };

    dates.forEach((date, index) => {
      const dayData = this.getForecastForTime(data.list, 15, date);
      const nightData = this.getForecastForTime(data.list, 3, date);
      formattedData[`day${index + 1}`] = this.formatDayData(dayData, nightData);
    });

    return formattedData;
  }

  formatDayData(dayData, nightData) {
    return {
      tempDay: Math.round(dayData.main.temp),
      tempNight: Math.round(nightData.main.temp),
      pressure: Math.round(dayData.main.pressure * 0.750062),
      windSpeedDay: Math.round(dayData.wind.speed),
      windSpeedNight: Math.round(nightData.wind.speed),
      windDirectionDay: this.getWindDirection(dayData.wind.deg),
      windDirectionNight: this.getWindDirection(nightData.wind.deg),
      weatherDay: this.getWeatherDescription(dayData.weather[0]),
      weatherNight: this.getWeatherDescription(nightData.weather[0]),
      cloudiness: dayData.clouds.all,
    };
  }

  getWindDirection(degrees) {
    const directions = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];
    return directions[Math.round(degrees / 45) % 8];
  }

  getWeatherDescription(weather) {
    const weatherTypes = {
      200: "Гроза",
      300: "Морось",
      500: "Дождь",
      600: "Снег",
      700: "Туман",
      800: "Ясно",
      801: "Малооблачно",
      802: "Облачно",
      803: "Пасмурно",
      804: "Пасмурно",
    };
    return weatherTypes[weather.id] || weather.description;
  }

  getForecastForTime(forecastList, targetHour, date) {
    const targetDate = new Date(date);
    targetDate.setHours(targetHour, 0, 0, 0);

    return (
      forecastList.find((item) => {
        const itemDate = new Date(item.dt * 1000);
        return (
          itemDate.getDate() === targetDate.getDate() &&
          itemDate.getHours() === targetHour
        );
      }) || forecastList[0]
    );
  }
}

class DateRangePicker {
  constructor(container, onChange) {
    this.container = container;
    this.onChange = onChange;
    this.selectedDates = [];
    this.currentMonth = new Date();
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="calendar-wrapper">
        <div class="calendar-header">
          <button class="prev-month">←</button>
          <span class="month-display"></span>
          <button class="next-month">→</button>
        </div>
        <div class="weekdays">
          <div>Пн</div>
          <div>Вт</div>
          <div>Ср</div>
          <div>Чт</div>
          <div>Пт</div>
          <div>Сб</div>
          <div>Вс</div>
        </div>
        <div class="dates"></div>
        <div class="selected-dates"></div>
      </div>
    `;

    this.container
      .querySelector(".prev-month")
      .addEventListener("click", () => this.changeMonth(-1));
    this.container
      .querySelector(".next-month")
      .addEventListener("click", () => this.changeMonth(1));

    this.renderCalendar();
  }

  renderCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    this.container.querySelector(".month-display").textContent = new Date(
      year,
      month,
    ).toLocaleString("ru", { month: "long", year: "numeric" });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDay = firstDay.getDay() || 7;
    startDay--;

    const datesContainer = this.container.querySelector(".dates");
    datesContainer.innerHTML = "";

    // Добавляем пустые ячейки
    for (let i = 0; i < startDay; i++) {
      datesContainer.appendChild(this.createDateElement(""));
    }

    // Добавляем дни месяца
    for (let i = 1; i <= daysInMonth; i++) {
      const dateElement = this.createDateElement(i);
      const currentDate = new Date(year, month, i);

      if (currentDate >= new Date()) {
        dateElement.addEventListener("click", () =>
          this.selectDate(currentDate),
        );

        if (this.isDateSelected(currentDate)) {
          dateElement.classList.add("selected");
        }
      } else {
        dateElement.classList.add("disabled");
      }

      datesContainer.appendChild(dateElement);
    }

    this.updateSelectedDatesDisplay();
  }

  createDateElement(content) {
    const div = document.createElement("div");
    div.classList.add("date");
    div.textContent = content;
    return div;
  }

  selectDate(date) {
    if (this.selectedDates.length >= 3) {
      this.selectedDates = [];
    }

    const dateString = date.toDateString();
    const index = this.selectedDates.findIndex(
      (d) => d.toDateString() === dateString,
    );

    if (index === -1) {
      this.selectedDates.push(date);
    } else {
      this.selectedDates.splice(index, 1);
    }

    this.selectedDates.sort((a, b) => a - b);
    this.renderCalendar();
    this.onChange(this.selectedDates);
  }

  isDateSelected(date) {
    return this.selectedDates.some(
      (d) => d.toDateString() === date.toDateString(),
    );
  }

  changeMonth(delta) {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + delta);
    this.renderCalendar();
  }

  updateSelectedDatesDisplay() {
    const container = this.container.querySelector(".selected-dates");
    container.innerHTML = `Выбранные даты: ${this.selectedDates
      .map((date) => date.toLocaleDateString("ru"))
      .join(", ")}`;
  }
}

class WeatherApp {
  constructor() {
    this.themeManager = new ThemeManager();
    this.apiKey = "51ff28f54bd5b10afbd421d8b8f5f822";
    this.weatherService = new WeatherService(this.apiKey);
    this.weatherData = {};
    this.selectedDates = [];

    this.dateRangePicker = new DateRangePicker(
      document.getElementById("calendar"),
      (dates) => this.onDatesChange(dates),
    );

    this.initializeUI();
  }

  initializeUI() {
    document
      .getElementById("export-ae")
      .addEventListener("click", () => this.exportForAE());
  }

  onDatesChange(dates) {
    this.selectedDates = dates;
    if (dates.length >= 2) {
      this.loadWeatherData();
    } else if (dates.length > 0) {
      this.showError("Пожалуйста, выберите как минимум две даты");
    }
  }

  async loadWeatherData() {
    this.showLoading(true);
    try {
      for (const city of this.weatherService.cities) {
        this.weatherData[city] = await this.weatherService.getWeatherData(
          city,
          this.selectedDates,
        );
      }
      this.updateTables();
      this.showSuccess("Данные успешно загружены");
    } catch (error) {
      this.showError("Ошибка при загрузке данных: " + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  updateTables() {
    const container = document.getElementById("tables-container");
    container.innerHTML = "";

    this.selectedDates.forEach((date, index) => {
      const tableDiv = document.createElement("div");
      tableDiv.className = "weather-table";
      tableDiv.innerHTML = `
        <h3>${date.toLocaleDateString("ru")}</h3>
        <table>
          ${this.createTableHTML(`day${index + 1}`)}
        </table>
      `;
      container.appendChild(tableDiv);
    });
  }

  createTableHTML(dayKey) {
    return `
        <thead>
          <tr>
            <th>Город</th>
            <th>День</th>
            <th>Ночь</th>
            <th>Погода</th>
            <th>Направление ветра</th>
            <th>Скорость ветра</th>
            <th>Давление</th>
          </tr>
        </thead>
        <tbody>
          ${this.weatherService.cities
            .map((city) => {
              const data = this.weatherData[city][dayKey];
              return `
              <tr>
                <td>${city}</td>
                <td>${data.tempDay}°C</td>
                <td>${data.tempNight}°C</td>
                <td>${data.weatherDay}</td>
                <td>${data.windDirectionDay}</td>
                <td>${data.windSpeedDay} м/с</td>
                <td>${data.pressure} мм</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      `;
  }

  exportForAE() {
    if (this.selectedDates.length < 2) {
      this.showError("Необходимо выбрать как минимум две даты перед экспортом");
      return;
    }
    const aeData = this.formatDataForAE();
    this.saveToWorkDirectory(aeData);
  }

  formatDataForAE() {
    const aeData = [{}];

    // Формируем список дней недели для отображения
    const daysOfWeek = this.selectedDates
      .map((date) => {
        const dayName = date.toLocaleString("ru", { weekday: "long" });
        // Заменяем пятницу и субботу
        if (dayName === "пятница") return "пятницу";
        if (dayName === "суббота") return "субботу";
        return dayName;
      })
      .join(", ")
      .replace(/, ([^,]+)$/, " и $1");

    // Создаем шаблон с пустыми значениями для всех полей
    const grafValues = {
      1: "800, 0, 800, 200",
      2: "800, 0, 800, 0",
      3: "800, 0, 800, 0",
      4: "600, 0, 800, 0",
      5: "600, 0, 800, 200",
      6: "640, 0, 800, 0",
      7: "800, 0, 800, 160",
      8: "640, 0, 800, 160",
      9: "400, 0, 800, 0",
      10: "480, 0, 800, 160",
      11: "480, 160, 800, 0",
      12: "320, 0, 800, 320",
      13: "200, 0, 800, 200",
      14: "400, 0, 800, 200",
      15: "400, 0, 800, 200",
    };

    for (let i = 1; i <= 15; i++) {
      // Добавляем данные городов
      aeData[0][`${i}city`] = this.weatherService.cities[i - 1] || "";
      aeData[0][`${i}Graf`] = grafValues[i];

      // Поля для температур, ветра и давления
      ["T", "AT"].forEach((suffix) => {
        aeData[0][`${i}TempDay${suffix}`] = "";
        aeData[0][`${i}TempNight${suffix}`] = "";
        aeData[0][`${i}IconDay${suffix}`] = "iconClouds.mov";
        aeData[0][`${i}IconNight${suffix}`] = "iconClouds.mov";
        aeData[0][`${i}WindDay${suffix}`] = "";
        aeData[0][`${i}WindNight${suffix}`] = "";
        aeData[0][`${i}ForceDay${suffix}`] = "";
        aeData[0][`${i}ForceNight${suffix}`] = "";
        aeData[0][`${i}PressureDay${suffix}`] = "";
        aeData[0][`${i}PressureNight${suffix}`] = "";
        aeData[0][`${i}ddmmm${suffix}`] = "";
        aeData[0][`${i}ddmmmTxt${suffix}`] = "";
        aeData[0][`${i}DayDdMm${suffix}`] = "";
        aeData[0][`${i}NightDdMm${suffix}`] = "";
      });
    }
    // Добавляем специальные поля для первого города
    Object.assign(aeData[0], {
      "1TxtDataT": `Прогноз на ${daysOfWeek}`,
      "1TxtDataAT": `Прогноз на ${daysOfWeek}`,
      "1TxtTxtData": `Прогноз на ${daysOfWeek}`,
      "1TxtMulticity": "Погода в Омской области",
      "1TxtCapital": "Погода в Омске",
      "1TxtSuorce": "По информации Омского гидрометцентра",
    });

    // Заполняем данными из API
    this.weatherService.cities.forEach((city, index) => {
      const cityNum = index + 1;
      const data = this.weatherData[city];

      if (data) {
        this.selectedDates.forEach((date, dateIndex) => {
          const dayKey = `day${dateIndex + 1}`;
          const suffix = dateIndex === 0 ? "T" : "AT";

          if (data[dayKey]) {
            // Температура с градусом
            aeData[0][`${cityNum}TempDay${suffix}`] =
              `${data[dayKey].tempDay > 0 ? "+" : ""}${data[dayKey].tempDay}°`;
            aeData[0][`${cityNum}TempNight${suffix}`] =
              `${data[dayKey].tempNight > 0 ? "+" : ""}${data[dayKey].tempNight}°`;

            // Иконки погоды
            aeData[0][`${cityNum}IconDay${suffix}`] = this.getIconName(
              data[dayKey].weatherDay,
            );
            aeData[0][`${cityNum}IconNight${suffix}`] = this.getIconName(
              data[dayKey].weatherNight,
            );

            // Направление и сила ветра
            aeData[0][`${cityNum}WindDay${suffix}`] =
              `ветер ${data[dayKey].windDirectionDay}`;
            aeData[0][`${cityNum}WindNight${suffix}`] =
              `ветер ${data[dayKey].windDirectionNight}`;
            aeData[0][`${cityNum}ForceDay${suffix}`] =
              `${data[dayKey].windSpeedDay} м/с`;
            aeData[0][`${cityNum}ForceNight${suffix}`] =
              `${data[dayKey].windSpeedNight} м/с`;

            // Давление
            aeData[0][`${cityNum}PressureDay${suffix}`] =
              `${data[dayKey].pressure} мм`;
            aeData[0][`${cityNum}PressureNight${suffix}`] =
              `${data[dayKey].pressure} мм`;

            // Форматирование дат
            const formattedDate = date.getDate().toString().padStart(2, "0");
            const monthNames = [
              "января",
              "февраля",
              "марта",
              "апреля",
              "мая",
              "июня",
              "июля",
              "августа",
              "сентября",
              "октября",
              "ноября",
              "декабря",
            ];
            const dayNames = [
              "воскресенье",
              "понедельник",
              "вторник",
              "среда",
              "четверг",
              "пятница",
              "суббота",
            ];

            // Отладочная информация для проверки
            console.log("Debug Info:", {
              cityNum,
              formattedDate,
              monthName: monthNames[date.getMonth()],
              dayName: dayNames[date.getDay()],
            });

            aeData[0][`${cityNum}ddmmm${suffix}`] =
              `${formattedDate} ${monthNames[date.getMonth()]}`;
            aeData[0][`${cityNum}ddmmmTxt${suffix}`] =
              `${formattedDate} ${monthNames[date.getMonth()]}. ${dayNames[date.getDay()]}`;
            aeData[0][`${cityNum}DayDdMm${suffix}`] =
              `День, ${formattedDate}.${(date.getMonth() + 1).toString().padStart(2, "0")}`;
            aeData[0][`${cityNum}NightDdMm${suffix}`] =
              `Ночь, ${formattedDate}.${(date.getMonth() + 1).toString().padStart(2, "0")}`;
          }
        });
      }
    });

    return aeData;
  }

  getIconName(weather) {
    const iconMapping = {
      Ясно: "iconSun.mov",
      Малооблачно: "iconSunCloud.mov",
      Облачно: "iconClouds.mov",
      Пасмурно: "iconClouds.mov",
      Дождь: "iconRain.mov",
      Снег: "iconSnowLight.mov",
      "Сильный снег": "iconSnowMedium.mov",
      Гроза: "iconStorm.mov",
      Туман: "iconFog.mov",
    };
    return iconMapping[weather] || "iconClouds.mov";
  }

  async saveToWorkDirectory(data) {
    try {
      // Путь по умолчанию
      const defaultPath = "C:\\WORK_2020\\POGODA";
      const filename = "MeteoData.json"; // Фиксированное имя файла

      try {
        // Пробуем получить доступ к директории
        const dirHandle = await window.showDirectoryPicker({
          startIn: defaultPath,
          mode: "readwrite",
        });

        // Создаем/перезаписываем файл
        const fileHandle = await dirHandle.getFileHandle(filename, {
          create: true,
        });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();

        this.showSuccess("Файл успешно сохранен в указанную директорию");
      } catch (dirError) {
        // Если не удалось получить доступ к директории, пробуем сохранить в загрузки
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          startIn: "downloads",
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();

        this.showSuccess("Файл успешно сохранен в загрузки");
      }
    } catch (err) {
      console.error("Ошибка при сохранении:", err);
      this.showError("Ошибка при сохранении файла");
      // Fallback: скачивание напрямую в загрузки браузера
      this.downloadJson(data, "MeteoData.json");
    }
  }

  downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  showLoading(show) {
    document.getElementById("loading").style.display = show ? "block" : "none";
  }

  showError(message) {
    const error = document.getElementById("error-message");
    error.textContent = message;
    error.style.display = "block";
    setTimeout(() => (error.style.display = "none"), 5000);
  }

  showSuccess(message) {
    const success = document.getElementById("success-message");
    success.textContent = message;
    success.style.display = "block";
    setTimeout(() => (success.style.display = "none"), 5000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new WeatherApp();
});

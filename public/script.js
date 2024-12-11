class Notification {
  constructor(type, styleOptions) {
    this.element = this.createElement(type, styleOptions);
    document.body.appendChild(this.element);
    this.hide();
  }

  createElement(id, styleOptions) {
    const div = document.createElement("div");
    div.id = id;
    div.style.cssText = styleOptions;
    return div;
  }

  show(message, timeout = 5000) {
    this.element.textContent = message;
    this.element.style.display = "block";
    setTimeout(() => this.hide(), timeout);
  }

  hide() {
    this.element.style.display = "none";
  }
}

// Классы для конкретных типов уведомлений
class ErrorNotification extends Notification {
  constructor() {
    super(
      "error-message",
      "position: fixed; top: 20px; right: 20px; background: #ff4444; color: white; padding: 15px; border-radius: 5px; display: none;",
    );
  }
}

class SuccessNotification extends Notification {
  constructor() {
    super(
      "success-message",
      "position: fixed; top: 20px; right: 20px; background: #44ff44; color: white; padding: 15px; border-radius: 5px; display: none;",
    );
  }
}

// Класс для работы с погодными данными
class WeatherService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  getCloudiness(percentage) {
    if (percentage <= 10) return "Ясно";
    else if (percentage <= 30) return "Малооблачно";
    else if (percentage <= 70) return "Переменная облачность";
    else if (percentage <= 90) return "Облачно";
    return "Пасмурно";
  }

  getWindDirection(degrees) {
    const directions = [
      "Северное",
      "Северо-Восток",
      "Восточное",
      "Юго-Восток",
      "Южное",
      "Юго-Запад",
      "Западное",
      "Северо-Запад",
    ];
    return directions[Math.round(degrees / 45) % 8];
  }

  getWeatherPhenomena(weatherId) {
    if (weatherId >= 200 && weatherId < 300) return "Гроза";
    if (weatherId >= 300 && weatherId < 400) return "Морось";
    if (weatherId >= 500 && weatherId < 600) return "Дождь";
    if (weatherId >= 600 && weatherId < 700) return "Снег";
    if (weatherId >= 700 && weatherId < 800) {
      if (weatherId === 741) return "Туман";
      if (weatherId === 771) return "Шквал";
      return "Дымка";
    }
    return "Без осадков";
  }

  async getWeatherData(city) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city},ru&units=metric&lang=ru&appid=${this.apiKey}`,
      );
      const data = await response.json();

      if (data.cod !== "200") {
        throw new Error(data.message);
      }

      return this.formatWeatherData(data, city);
    } catch (error) {
      throw new Error(
        `Ошибка получения данных для города ${city}: ${error.message}`,
      );
    }
  }

  formatWeatherData(data, city) {
    const tomorrowData = this.getForecastForTime(data.list, 15); // 15:00 для дня
    const tomorrowNightData = this.getForecastForTime(data.list, 3); // 03:00 для ночи
    const dayAfterData = this.getForecastForNextDay(data.list, 15);
    const dayAfterNightData = this.getForecastForNextDay(data.list, 3);

    return {
      city,
      // Данные на завтра (table1)
      tomorrow: {
        tempDay: Math.round(tomorrowData.main.temp),
        tempNight: Math.round(tomorrowNightData.main.temp),
        pressure: Math.round(tomorrowData.main.pressure * 0.750062),
        windSpeedDay: Math.round(tomorrowData.wind.speed),
        windSpeedNight: Math.round(tomorrowNightData.wind.speed),
        windDirectionDay: this.getWindDirection(tomorrowData.wind.deg),
        windDirectionNight: this.getWindDirection(tomorrowNightData.wind.deg),
        weatherDay: this.getWeatherPhenomena(tomorrowData.weather[0].id),
        weatherNight: this.getWeatherPhenomena(tomorrowNightData.weather[0].id),
        cloudinessDay: this.getCloudiness(tomorrowData.clouds.all),
        cloudinessNight: this.getCloudiness(tomorrowNightData.clouds.all),
      },
      // Данные на послезавтра (table2)
      dayAfter: {
        tempDay: Math.round(dayAfterData.main.temp),
        tempNight: Math.round(dayAfterNightData.main.temp),
        pressure: Math.round(dayAfterData.main.pressure * 0.750062),
        windSpeedDay: Math.round(dayAfterData.wind.speed),
        windSpeedNight: Math.round(dayAfterNightData.wind.speed),
        windDirectionDay: this.getWindDirection(dayAfterData.wind.deg),
        windDirectionNight: this.getWindDirection(dayAfterNightData.wind.deg),
        weatherDay: this.getWeatherPhenomena(dayAfterData.weather[0].id),
        weatherNight: this.getWeatherPhenomena(dayAfterNightData.weather[0].id),
        cloudinessDay: this.getCloudiness(dayAfterData.clouds.all),
        cloudinessNight: this.getCloudiness(dayAfterNightData.clouds.all),
      },
    };
  }

  getForecastForTime(forecastList, targetHour) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const forecast of forecastList) {
      const forecastDate = new Date(forecast.dt * 1000);
      if (
        forecastDate.getDate() === tomorrow.getDate() &&
        forecastDate.getHours() === targetHour
      ) {
        return forecast;
      }
    }

    return forecastList[0];
  }

  getForecastForNextDay(forecastList, targetHour) {
    const now = new Date();
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);

    for (const forecast of forecastList) {
      const forecastDate = new Date(forecast.dt * 1000);
      if (
        forecastDate.getDate() === dayAfter.getDate() &&
        forecastDate.getHours() === targetHour
      ) {
        return forecast;
      }
    }

    return forecastList[0];
  }
}

// Класс для обработки Excel файлов
class ExcelProcessor {
  constructor(weatherService) {
    this.weatherService = weatherService;
    this.loadingIndicator = this.createLoadingIndicator();
  }

  createLoadingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "loading";
    indicator.innerHTML = "Загрузка...";
    indicator.style.display = "none";
    document.body.appendChild(indicator);
    return indicator;
  }

  async processFile(file) {
    try {
      this.validateFile(file);
      this.showLoading("Загрузка файла...");

      const cities = await this.extractCities(file);
      const weatherData = await this.collectWeatherData(cities);
      await this.updateExcelFile(file, weatherData);

      return true;
    } catch (error) {
      throw error;
    } finally {
      this.hideLoading();
    }
  }

  validateFile(file) {
    if (!file.name.match(/\.(xlsx|xls|xlsm)$/i)) {
      throw new Error(
        "Пожалуйста, загрузите файл Excel (.xlsx, .xls или .xlsm)",
      );
    }
  }

  showLoading(message) {
    this.loadingIndicator.innerHTML = message;
    this.loadingIndicator.style.display = "block";
  }

  hideLoading() {
    this.loadingIndicator.style.display = "none";
  }

  async extractCities(file) {
    const formData = new FormData();
    formData.append("excel_file", file);

    const response = await fetch("/src/process.php?action=extract", {
      method: "POST",
      body: formData,
    });

    const result = await this.parseResponse(response);

    if (!result.cities || result.cities.length === 0) {
      throw new Error("В файле Excel не найдены города.");
    }

    return result.cities;
  }

  async parseResponse(response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Ошибка при разборе ответа сервера: ${e.message}`);
    }
  }

  async collectWeatherData(cities) {
    const weatherData = [];
    for (const city of cities) {
      this.showLoading(`Загрузка данных для города ${city.name}...`);
      try {
        const data = await this.weatherService.getWeatherData(city.name);
        weatherData.push(data);
      } catch (error) {
        console.error(error);
      }
    }

    if (weatherData.length === 0) {
      throw new Error(
        "Не удалось получить данные о погоде ни для одного города.",
      );
    }

    return weatherData;
  }

  async updateExcelFile(file, weatherData) {
    this.showLoading("Обновление файла Excel...");

    const formData = new FormData();
    formData.append("excel_file", file);
    formData.append("weather_data", JSON.stringify(weatherData));

    const response = await fetch("/src/process.php?action=update", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Ошибка при обновлении файла Excel: ${response.status}`);
    }

    const blob = await response.blob();
    this.downloadFile(blob, file.name);
  }

  downloadFile(blob, fileName) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
}

// Главный класс приложения
class WeatherApp {
  constructor() {
    this.apiKey = "51ff28f54bd5b10afbd421d8b8f5f822";
    this.weatherService = new WeatherService(this.apiKey);
    this.excelProcessor = new ExcelProcessor(this.weatherService);
    this.errorNotification = new ErrorNotification();
    this.successNotification = new SuccessNotification();
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    document
      .getElementById("upload-form")
      .addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.handleFormSubmit();
      });
  }

  async handleFormSubmit() {
    const fileInput = document.getElementById("excel-file");
    const file = fileInput.files[0];

    if (!file) {
      this.errorNotification.show("Пожалуйста, выберите файл.");
      return;
    }

    try {
      await this.excelProcessor.processFile(file);
      this.successNotification.show("Файл успешно обновлен и сохранен");
    } catch (error) {
      this.errorNotification.show(error.message);
      console.error("Подробности ошибки:", error);
    }
  }
}

// Инициализация приложения
const app = new WeatherApp();

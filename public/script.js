class WeatherService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.cities = [
      "Омск",
      "Усть-Ишим",
      "Тара",
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
      console.error(`Ошибка получения данных для ${city}:`, error);
      throw error;
    }
  }

  formatWeatherData(data, city) {
    const tomorrowData = this.getForecastForTime(data.list, 15);
    const tomorrowNightData = this.getForecastForTime(data.list, 3);
    const dayAfterData = this.getForecastForNextDay(data.list, 15);
    const dayAfterNightData = this.getForecastForNextDay(data.list, 3);

    return {
      city,
      tomorrow: this.formatDayData(tomorrowData, tomorrowNightData),
      dayAfter: this.formatDayData(dayAfterData, dayAfterNightData),
    };
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
    const directions = ["Северный", "Северо-Восточное", "Восточный", "Юго-Восточное", "Южный", "Юго-Западное", "Западный", "Северо-Западное"];
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

  getForecastForTime(forecastList, targetHour) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(targetHour, 0, 0, 0);

    return (
      forecastList.find((item) => {
        const itemDate = new Date(item.dt * 1000);
        return (
          itemDate.getDate() === tomorrow.getDate() &&
          itemDate.getHours() === targetHour
        );
      }) || forecastList[0]
    );
  }

  getForecastForNextDay(forecastList, targetHour) {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(targetHour, 0, 0, 0);

    return (
      forecastList.find((item) => {
        const itemDate = new Date(item.dt * 1000);
        return (
          itemDate.getDate() === dayAfter.getDate() &&
          itemDate.getHours() === targetHour
        );
      }) || forecastList[0]
    );
  }
}

class WeatherApp {
  constructor() {
    this.apiKey = "51ff28f54bd5b10afbd421d8b8f5f822";
    this.weatherService = new WeatherService(this.apiKey);
    this.weatherData = {};

    this.initializeUI();
    this.loadWeatherData();
  }

  initializeUI() {
    this.updateDates();
    document
      .getElementById("export-ae")
      .addEventListener("click", () => this.exportForAE());
  }

  updateDates() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    document.getElementById("tomorrow-date").textContent =
      tomorrow.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    document.getElementById("dayafter-date").textContent =
      dayAfter.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }

  async loadWeatherData() {
    this.showLoading(true);
    try {
      for (const city of this.weatherService.cities) {
        this.weatherData[city] = await this.weatherService.getWeatherData(city);
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
    const tables = ["tomorrow-table", "dayafter-table"];
    const periods = ["tomorrow", "dayAfter"];

    tables.forEach((tableId, index) => {
      const table = document.getElementById(tableId);
      table.innerHTML = this.createTableHTML(periods[index]);
    });
  }

  createTableHTML(period) {
    return `
            <thead>
                <tr>
                    <th>Город</th>
                    <th>День</th>
                    <th>Ночь</th>
                    <th>Погода</th>
                    <th>Ветер</th>
                    <th>Давление</th>
                </tr>
            </thead>
            <tbody>
                ${this.weatherService.cities
                  .map((city) => {
                    const data = this.weatherData[city][period];
                    return `
                        <tr>
                            <td>${city}</td>
                            <td>${data.tempDay}°C</td>
                            <td>${data.tempNight}°C</td>
                            <td>${data.weatherDay}</td>
                            <td>${data.windDirectionDay} ${data.windSpeedDay} м/с</td>
                            <td>${data.pressure} мм</td>
                        </tr>
                    `;
                  })
                  .join("")}
            </tbody>
        `;
  }

  exportForAE() {
    const aeData = this.formatDataForAE();
    this.downloadJson(aeData, "MeteoData.json");
  }

  formatDataForAE() {
    const aeData = [{}];

    this.weatherService.cities.forEach((city, index) => {
      const cityNum = index + 1;
      const data = this.weatherData[city];

      // Базовые данные о городе
      aeData[0][`${cityNum}city`] = city;

      // Температура
      aeData[0][`${cityNum}TempDayT`] = data.tomorrow.tempDay.toString();
      aeData[0][`${cityNum}TempNightT`] = data.tomorrow.tempNight.toString();
      aeData[0][`${cityNum}TempDayAT`] = data.dayAfter.tempDay.toString();
      aeData[0][`${cityNum}TempNightAT`] = data.dayAfter.tempNight.toString();

      // Иконки
      aeData[0][`${cityNum}IconDayT`] = this.getIconName(
        data.tomorrow.weatherDay,
      );
      aeData[0][`${cityNum}IconNightT`] = this.getIconName(
        data.tomorrow.weatherNight,
      );
      aeData[0][`${cityNum}IconDayAT`] = this.getIconName(
        data.dayAfter.weatherDay,
      );
      aeData[0][`${cityNum}IconNightAT`] = this.getIconName(
        data.dayAfter.weatherNight,
      );

      // График (пример значений)
      aeData[0][`${cityNum}Graf`] = "800, 0, 800, 200";
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
      Гроза: "iconStorm.mov",
      Туман: "iconFog.mov",
    };
    return iconMapping[weather] || "iconClouds.mov";
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

// Инициализация приложения
document.addEventListener("DOMContentLoaded", () => {
  const app = new WeatherApp();
});
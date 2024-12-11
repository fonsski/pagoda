<?php
namespace App;
use Exception;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ExcelProcessor
{
    private $uploadDir;
    private $tableConfigs;
    private $allowedExtensions = ["xlsx", "xls", "xlsm"];
    private $filePath;

    public function __construct()
    {
        $this->uploadDir = __DIR__ . "/../public/upload/";
        $this->tableConfigs = [
            "table1" => [
                "startRow" => 8,
                "endRow" => 22,
            ],
            "table2" => [
                "startRow" => 31,
                "endRow" => 45,
            ],
        ];
    }

    public function processRequest()
    {
        try {
            $this->validateRequest();
            $action = $_GET["action"] ?? "";

            $this->handleFileUpload();
            $sheet = $this->loadSpreadsheet();

            switch ($action) {
                case "extract":
                    return $this->extractCities($sheet);
                case "update":
                    return $this->updateWeatherData($sheet);
                default:
                    throw new Exception("Неверное действие");
            }
        } catch (Exception $e) {
            return $this->handleError($e);
        } finally {
            $this->cleanup();
        }
    }

    private function validateRequest()
    {
        if ($_SERVER["REQUEST_METHOD"] !== "POST") {
            throw new Exception("Неверный метод запроса");
        }
    }

    private function handleFileUpload()
    {
        if (
            !isset($_FILES["excel_file"]) ||
            $_FILES["excel_file"]["error"] !== UPLOAD_ERR_OK
        ) {
            throw new Exception("Ошибка загрузки файла");
        }

        if (!is_uploaded_file($_FILES["excel_file"]["tmp_name"])) {
            throw new Exception("Файл не был загружен через HTTP POST");
        }

        if ($_FILES["excel_file"]["size"] === 0) {
            throw new Exception("Загружен пустой файл");
        }

        $extension = strtolower(
            pathinfo($_FILES["excel_file"]["name"], PATHINFO_EXTENSION)
        );
        if (!in_array($extension, $this->allowedExtensions)) {
            throw new Exception(
                "Неверный тип файла. Разрешены только файлы Excel (.xlsx, .xls, .xlsm)"
            );
        }

        $this->ensureUploadDirectory();
        $this->saveUploadedFile($extension);
    }

    private function ensureUploadDirectory()
    {
        if (
            !file_exists($this->uploadDir) &&
            !mkdir($this->uploadDir, 0755, true)
        ) {
            throw new Exception("Не удалось создать директорию для загрузки");
        }
    }

    private function saveUploadedFile(string $extension)
    {
        $safeFileName = $this->generateSafeFileName(
            $_FILES["excel_file"]["name"]
        );
        $this->filePath = $this->uploadDir . $safeFileName;

        if (
            !move_uploaded_file(
                $_FILES["excel_file"]["tmp_name"],
                $this->filePath
            )
        ) {
            throw new Exception("Ошибка сохранения файла");
        }
    }

    private function loadSpreadsheet(): Worksheet
    {
        $extension = pathinfo($this->filePath, PATHINFO_EXTENSION);
        $reader = $this->createReader($extension);
        $spreadsheet = $reader->load($this->filePath);
        $sheet = $spreadsheet->getSheetByName("METEO");

        if (!$sheet) {
            throw new Exception("Лист 'METEO' не найден в документе");
        }

        return $sheet;
    }

    private function createReader(string $extension)
    {
        if ($extension === "xlsm") {
            $reader = new \PhpOffice\PhpSpreadsheet\Reader\Xlsx();
            $reader->setReadDataOnly(false);
            $reader->setLoadSheetsOnly(["METEO"]);
            $reader->setIncludeCharts(false);
        } else {
            $reader = IOFactory::createReader("Xlsx");
            $reader->setReadDataOnly(true);
            $reader->setLoadSheetsOnly(["METEO"]);
        }
        return $reader;
    }

    private function extractCities(Worksheet $sheet)
    {
        $cities = [];
        $this->processRowRanges($sheet, function (
            $sheet,
            $row,
            $tableName
        ) use (&$cities) {
            $city = trim($sheet->getCell("C$row")->getValue());
            if ($city) {
                $cities[] = [
                    "name" => $city,
                    "table" => $tableName,
                ];
            }
        });

        if (empty($cities)) {
            throw new Exception("Города не найдены в файле");
        }

        return ["cities" => $cities];
    }

    private function updateWeatherData(Worksheet $sheet)
    {
        if (!isset($_POST["weather_data"])) {
            throw new Exception("Данные о погоде не предоставлены");
        }

        $weatherData = json_decode($_POST["weather_data"], true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Ошибка в формате данных о погоде");
        }

        $this->updateCells($sheet, $weatherData);
        $this->saveAndDownload($sheet->getParent());
    }

    private function updateCells(Worksheet $sheet, array $weatherData)
    {
        // Добавляем обновление дат и дней недели
        $tomorrow = new \DateTime("tomorrow");
        $dayAfterTomorrow = new \DateTime("tomorrow + 1 day");

        // Форматируем даты
        $tomorrowFormatted = $tomorrow->format("d.m.Y");
        $tomorrowDay = $tomorrow->format("j");
        $tomorrowMonth = mb_convert_case(
            $tomorrow->format("F"),
            MB_CASE_TITLE,
            "UTF-8"
        );
        $tomorrowDayName = mb_convert_case(
            $tomorrow->format("l"),
            MB_CASE_UPPER,
            "UTF-8"
        );

        $dayAfterFormatted = $dayAfterTomorrow->format("d.m.Y");
        $dayAfterDay = $dayAfterTomorrow->format("j");
        $dayAfterMonth = mb_convert_case(
            $dayAfterTomorrow->format("F"),
            MB_CASE_TITLE,
            "UTF-8"
        );
        $dayAfterDayName = mb_convert_case(
            $dayAfterTomorrow->format("l"),
            MB_CASE_UPPER,
            "UTF-8"
        );

        // Русские названия месяцев
        $monthsRu = [
            "January" => "января",
            "February" => "февраля",
            "March" => "марта",
            "April" => "апреля",
            "May" => "мая",
            "June" => "июня",
            "July" => "июля",
            "August" => "августа",
            "September" => "сентября",
            "October" => "октября",
            "November" => "ноября",
            "December" => "декабря",
        ];

        // Русские названия дней недели
        $daysRu = [
            "MONDAY" => "ПОНЕДЕЛЬНИК",
            "TUESDAY" => "ВТОРНИК",
            "WEDNESDAY" => "СРЕДА",
            "THURSDAY" => "ЧЕТВЕРГ",
            "FRIDAY" => "ПЯТНИЦА",
            "SATURDAY" => "СУББОТА",
            "SUNDAY" => "ВОСКРЕСЕНЬЕ",
        ];

        foreach ($weatherData as $data) {
            $this->processRowRanges($sheet, function (
                $sheet,
                $row,
                $tableName
            ) use ($data) {
                if ($sheet->getCell("C$row")->getValue() === $data["city"]) {
                    // Данные на завтра (table1)
                    if ($tableName === "table1") {
                        $dayData = $data["tomorrow"];
                        $updates = [
                            "T$row" => $dayData["tempDay"] . " °C",
                            "BV$row" => $dayData["tempNight"] . " °C",
                            "BC6" => $dayData["pressure"] . " мм",
                            "AL6" => $dayData["windSpeedDay"] . " м/с",
                            "BO6" => $dayData["windSpeedNight"] . " м/с",
                            "T6" => $dayData["windDirectionDay"],
                            "BV6" => $dayData["windDirectionNight"],
                            "AW$row" => $dayData["weatherDay"],
                            "BH$row" => $dayData["weatherNight"],
                            "Z$row" => $dayData["cloudinessDay"],
                            "BK$row" => $dayData["cloudinessNight"],
                        ];
                    }
                    // Данные на послезавтра (table2)
                    elseif ($tableName === "table2") {
                        $dayData = $data["dayAfter"];
                        $updates = [
                            "T$row" => $dayData["tempDay"] . " °C",
                            "BV$row" => $dayData["tempNight"] . " °C",
                            "BC29" => $dayData["pressure"] . " мм",
                            "AL29" => $dayData["windSpeedDay"] . " м/с",
                            "BO29" => $dayData["windSpeedNight"] . " м/с",
                            "T29" => $dayData["windDirectionDay"],
                            "BV29" => $dayData["windDirectionNight"],
                            "AW$row" => $dayData["weatherDay"],
                            "BH$row" => $dayData["weatherNight"],
                            "Z$row" => $dayData["cloudinessDay"],
                            "BK$row" => $dayData["cloudinessNight"],
                        ];
                    }

                    foreach ($updates as $cell => $value) {
                        $style = $sheet->getStyle($cell)->exportArray();
                        $sheet->setCellValueExplicit(
                            $cell,
                            $value,
                            DataType::TYPE_STRING
                        );
                        $sheet->getStyle($cell)->applyFromArray($style);
                    }
                }
            });
        }

        // Обновляем даты
        $sheet->setCellValue("L2", $tomorrowFormatted);
        $sheet->setCellValue(
            "AG2",
            $tomorrowDay . " " . $monthsRu[$tomorrowMonth]
        );
        $sheet->setCellValue("W2", $daysRu[$tomorrowDayName]);

        $sheet->setCellValue("L25", $dayAfterFormatted);
        $sheet->setCellValue(
            "AG25",
            $dayAfterDay . " " . $monthsRu[$dayAfterMonth]
        );
        $sheet->setCellValue("W25", $daysRu[$dayAfterDayName]);
    }

    private function processRowRanges(Worksheet $sheet, callable $callback)
    {
        foreach ($this->tableConfigs as $tableName => $config) {
            $startRow = max(1, $config["startRow"]);
            $endRow = min($config["endRow"], $sheet->getHighestRow());

            if ($startRow > $endRow) {
                throw new Exception(
                    "Неверный диапазон строк для таблицы $tableName"
                );
            }

            for ($row = $startRow; $row <= $endRow; $row++) {
                $callback($sheet, $row, $tableName);
            }
        }
    }

    private function saveAndDownload(Spreadsheet $spreadsheet)
    {
        $writer = new Xlsx($spreadsheet);
        $writer->setIncludeCharts(true);
        $writer->setPreCalculateFormulas(true);

        $spreadsheet->getActiveSheet()->setShowGridlines(true);
        $spreadsheet->getActiveSheet()->getPageSetup()->setFitToWidth(1);
        $spreadsheet->getActiveSheet()->getPageSetup()->setFitToHeight(0);

        $writer->save($this->filePath);

        header("Content-Type: application/vnd.ms-excel.sheet.macroEnabled.12");
        header(
            'Content-Disposition: attachment; filename="' .
                basename($_FILES["excel_file"]["name"]) .
                '"'
        );
        header("Content-Length: " . filesize($this->filePath));
        readfile($this->filePath);
        exit();
    }

    private function generateSafeFileName($originalName)
    {
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        return uniqid() . "_" . time() . "." . $extension;
    }

    private function handleError(Exception $e)
    {
        http_response_code(400);
        return [
            "error" => $e->getMessage(),
            "detail" => $e->getTraceAsString(),
        ];
    }

    private function cleanup()
    {
        if (isset($this->filePath) && file_exists($this->filePath)) {
            unlink($this->filePath);
        }
    }
}

// Использование:
error_reporting(E_ALL);
ini_set("display_errors", 1);
require __DIR__ . "/../vendor/autoload.php";

header("Content-Type: application/json; charset=utf-8");

$processor = new ExcelProcessor();
$result = $processor->processRequest();
if (is_array($result)) {
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
}
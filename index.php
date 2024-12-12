<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/src/WeatherProcessor.php';

$template = file_get_contents(__DIR__ . '/templates/form.html');
echo $template;
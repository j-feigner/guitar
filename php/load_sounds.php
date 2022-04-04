<?php
    $dir_contents = scandir("../sounds");
    array_shift($dir_contents);
    array_shift($dir_contents);
    echo(json_encode($dir_contents));
?>
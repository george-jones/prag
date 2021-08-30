cd "C:\Program Files\Activision\Call of Duty 4 - Modern Warfare\bin\CoD4CompileTools\"
cod4compiletools_compilebsp.bat "C:\Program Files\Activision\Call of Duty 4 - Modern Warfare\raw\maps\mp\" "C:\Program Files\Activision\Call of Duty 4 - Modern Warfare\map_source\" "C:\Program Files\Activision\Call of Duty 4 - Modern Warfare\" %1 - "-extra" 1 1 1 1

cd C:\Program Files\Activision\Call of Duty 4 - Modern Warfare\bin\
linker_pc %1

cd C:\Program Files\Activision\Call of Duty 4 - Modern Warfare\bin\
linker_pc %1_load

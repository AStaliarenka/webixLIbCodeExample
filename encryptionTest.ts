import {EncryptionTestLSProgress, IntellectualTestServerResponce} from 'sources/@types';
import BaseTest from 'sources/components/baseTest';
import DigitalKeyboard from 'sources/components/digitalKeyboard';
import {API} from 'sources/constants/api';
import {IntellectualTestIds, StepIds} from 'sources/constants/steps';
import {shiftMask, xor} from 'sources/helpers/mask';

import {CustomTextConfig, Digits, EncryptionTestData} from './@types';
import {LocalIds} from './localIds';

import './style.css';

const digitalKeyboardWidth = 350;
const digitalKeyboardHeight = 340;

const firstValuebleInputId = 11;
const lastFormInputId = 120;

const testTimeSec = 90;
const testTime = testTimeSec * 1000; /* millisec */

const activeInputCss = 'active';

export default class EncryptionTest extends BaseTest {
  protected step = StepIds.IntellectualTests;

  protected subStep = IntellectualTestIds.EncryptionTest;

  protected data: EncryptionTestData;

  private currentEnabledInputId = 1;

  private digitalKeyboard: DigitalKeyboard;

  private answersForm: webix.ui.form;

  private taskRow: webix.ui.layout;

  private score = 0;

  private lastAnsweredInputId: number;

  private symbolLocalId = 1;

  private timerLabel: webix.ui.label;

  private timeCounter = testTimeSec;

  private intervalId: ReturnType<typeof setTimeout>;

  config() {
    this.digitalKeyboard = new DigitalKeyboard(
      this.app,
      {
        buttonConfig: {
          height: 76,
          width: 84,
          clickHandler: this.handleAnswer.bind(this)
        },
        panelConfig: {
          paddingX: 26,
          paddingY: 38,
          width: digitalKeyboardWidth,
          height: digitalKeyboardHeight
        }
      },
      false
    );

    const mainCols = {
      css: 'code-form',
      view: 'form',
      localId: LocalIds.AnswersForm,
      borderless: true,
      margin: 10,
      width: 620,
      height: 590,
      type: 'clean',
      rows: []
    } as webix.ui.formConfig;

    const timerLabelConfig = {
      css: 'timer-label',
      view: 'label',
      width: 250,
      height: 46,
      label: this.generateTimerLabelStr(testTimeSec),
      localId: LocalIds.TimerLabel
    } as webix.ui.labelConfig;

    return {
      rows: [
        {},
        {
          cols: [
            {},
            {rows: [
              {},
              {
                cols: [
                  mainCols,
                  {minWidth: 100} as webix.ui.spacerConfig,
                  {
                    rows: [
                      {height: 10} as webix.ui.spacerConfig,
                      {
                        cols: [
                          timerLabelConfig,
                          {}
                        ]
                      },
                      {},
                      {
                        css: 'static-encrypt-row',
                        cols: [
                          {},
                          {
                            height: 65,
                            localId: LocalIds.TaskRow,
                            cols: []
                          },
                          {}
                        ]
                      },
                      {},
                      this.digitalKeyboard,
                      {}
                    ]
                  }
                ]
              },
              {}
            ]},
            {}
          ]
        },
        {}
      ]
    };
  }

  async readyAfterValidation() {
    this.createVariables();

    await this.loadData(API.encryptionTest);

    this.attachEvents();
  }

  private attachEvents() {
    const lastUnveluebleTextInput = this.$$(String(firstValuebleInputId - 1)) as webix.ui.text;
    const lastTextInput = this.$$(String(lastFormInputId)) as webix.ui.text;

    let timer: ReturnType<typeof setTimeout> | null;

    this.on(lastUnveluebleTextInput, 'onChange', () => {
      this.timerLabel.enable();

      this.intervalId = setInterval(() => {
        this.timeCounter--;

        this.timerLabel.setValue(this.generateTimerLabelStr(this.timeCounter));
      }, 1000);

      timer = setTimeout(() => {
        if (!this.getRoot()) return;

        this.lastAnsweredInputId = this.currentEnabledInputId - 1;

        this.finish();
      }, testTime);
    });

    this.on(lastTextInput, 'onChange', () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      this.lastAnsweredInputId = lastFormInputId;
      this.finish();
    });
  }

  setData() {
    const staticRow = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    this.symbolLocalId = 1;

    const answerElems = this.data
      .map(rowArr => ({cols: this.generateEncryptRow(rowArr)}));
    webix.ui(answerElems, this.answersForm);

    const taskElems = staticRow
      .map(id => this.getCodeLayoutConfig(id, id, true));
    webix.ui(taskElems, this.taskRow);

    const textInput = this.$$('1') as webix.ui.text;
    this.timerLabel.disable();

    this.markActiveInput(textInput.getNode() as HTMLElement);
  }

  decrypt(resp: IntellectualTestServerResponce) {
    const {data, mask} = resp;
    const shiftedMask = shiftMask(mask);
    return data.map(row => row.map(num => xor(num, shiftedMask)));
  }

  private generateEncryptRow(valuesArr: Array<Digits>) {
    return valuesArr.map(id => this.getCodeLayoutConfig(id, this.symbolLocalId++));
  }

  private generateTimerLabelStr(sec: number) {
    return `Осталось секунд: ${sec}`;
  }

  private handleAnswer(button: webix.ui.button) {
    const value = button.getValue();

    const id = String(this.currentEnabledInputId);

    const textInput = this.$$(String(this.currentEnabledInputId)) as webix.ui.text;

    this.answersForm.setValues({
      [id]: value
    }, true);

    this.unmarkActiveInput(textInput.getNode() as HTMLElement);

    if (this.currentEnabledInputId !== lastFormInputId) {
      const nextTextInput = this.$$(String(this.currentEnabledInputId + 1)) as webix.ui.text;

      this.markActiveInput(nextTextInput.getNode() as HTMLElement);

      this.currentEnabledInputId++;
    } else {
      this.digitalKeyboard.view.disable();
    }

    button.blur();
  }

  private createVariables() {
    this.answersForm = this.$$(LocalIds.AnswersForm) as webix.ui.form;
    this.timerLabel = this.$$(LocalIds.TimerLabel) as webix.ui.label;
    this.taskRow = this.$$(LocalIds.TaskRow) as webix.ui.layout;
  }

  private markActiveInput(node: HTMLElement) {
    webix.html.addCss(node, activeInputCss);
  }

  private unmarkActiveInput(node: HTMLElement) {
    webix.html.removeCss(node, activeInputCss);
  }

  getCodeLayoutConfig(charId: number, inputId: number, isStaticInput?: boolean) {
    const encryptComponentCss = 'encrypt-component';

    return {
      css: encryptComponentCss,
      height: 65,
      width: 40,
      rows: [
        {
          view: 'template',
          css: `${encryptComponentCss}__template`,
          borderless: true,
          height: 25,
          type: 'clean',
          template: `<img src="assets/icons/encryption/char_${charId}.svg" class='encryption-icon'>`
        } as webix.ui.templateConfig,
        {
          localId: String(inputId),
          height: 40,
          view: 'text',
          disabled: true,
          name: String(inputId),
          ...(isStaticInput ? {value: inputId} : {correctAnswer: charId})
        } as CustomTextConfig
      ]
    } as webix.ui.layoutConfig;
  }

  private calculateScore() {
    this.score = 0;
    const values = this.answersForm.getValues() as { [key: string]: string };

    for (let i = firstValuebleInputId; i < this.lastAnsweredInputId + 1; i++) {
      const correctAnswer = ((this.$$(String(i)) as webix.ui.text)
        .config as CustomTextConfig).correctAnswer;

      if (values[i] === String(correctAnswer)) {
        this.score++;
      }
    }
  }

  applyInitialConditions(progress: EncryptionTestLSProgress) {
    if (progress.serverData) {
      this.data = progress.serverData;
    }
  }

  private getNewCurrentProgress(progress: EncryptionTestLSProgress) {
    if (!progress.serverData && this.data) {
      progress.serverData = this.data;
    }
    return progress;
  }

  private getTestResult() {
    this.calculateScore();

    return {
      score: this.score
    };
  }

  private finish() {
    clearInterval(this.intervalId);

    super.finish();
  }
}
